"""Capa unificada de proveedores de IA ($0 por defecto con local/Ollama o capas gratuitas Groq/Gemini)."""
import logging
import time
from typing import Callable

import httpx

from app.core.config import settings

logger = logging.getLogger("prepia.llm_provider")

TIMEOUT_SECONDS = 30.0
RETRY_WAIT_SECONDS = 1.5
EXTERNAL_PROVIDERS = {"groq", "gemini", "openai", "anthropic"}
LOCAL_ONLY_PROVIDERS = {"local", "ollama"}


class LLMProviderError(RuntimeError):
    """Error controlado al invocar un proveedor de IA (no expone secretos ni contenido del CV)."""

    def __init__(self, provider: str, message: str):
        self.provider = provider
        super().__init__(message)


def _post_with_retry(provider: str, fn: Callable[[], httpx.Response]) -> httpx.Response:
    """Ejecuta una petición HTTP con 1 reintento con espera ante códigos 429 o 5xx."""
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            resp = fn()
        except httpx.HTTPError as exc:
            last_exc = exc
            if attempt == 0:
                time.sleep(RETRY_WAIT_SECONDS)
                continue
            raise LLMProviderError(provider, type(exc).__name__) from exc

        if resp.status_code in (429,) or 500 <= resp.status_code < 600:
            if attempt == 0:
                time.sleep(RETRY_WAIT_SECONDS)
                continue
            raise LLMProviderError(provider, f"HTTP_{resp.status_code}")

        if resp.status_code >= 400:
            raise LLMProviderError(provider, f"HTTP_{resp.status_code}")

        return resp

    raise LLMProviderError(provider, type(last_exc).__name__ if last_exc else "UnknownError")


def _call_ollama(system: str, user: str) -> str:
    base = settings.OLLAMA_BASE_URL.rstrip("/")
    url = f"{base}/api/chat"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    resp = _post_with_retry("ollama", lambda: httpx.post(url, json=payload, timeout=TIMEOUT_SECONDS))
    data = resp.json()
    content = ((data.get("message") or {}).get("content") or "").strip()
    if not content:
        raise LLMProviderError("ollama", "EmptyResponse")
    return content


def _call_openai_compatible(provider: str, url: str, api_key: str, model: str, system: str, user: str) -> str:
    if not api_key:
        raise LLMProviderError(provider, "MissingAPIKey")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": 1024,
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    resp = _post_with_retry(provider, lambda: httpx.post(url, headers=headers, json=payload, timeout=TIMEOUT_SECONDS))
    data = resp.json()
    choices = data.get("choices") or []
    content = ((choices[0].get("message") or {}).get("content") if choices else "") or ""
    content = content.strip()
    if not content:
        raise LLMProviderError(provider, "EmptyResponse")
    return content


def _extract_gemini_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    parts = ((candidates[0].get("content") or {}).get("parts") or []) if candidates else []
    visible = [p.get("text", "") for p in parts if isinstance(p, dict) and not p.get("thought") and p.get("text")]
    return "".join(visible).strip()


def _call_gemini(system: str, user: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise LLMProviderError("gemini", "MissingAPIKey")

    candidate_models = []
    for m in (
        settings.GEMINI_MODEL,
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest",
    ):
        if m and m not in candidate_models:
            candidate_models.append(m)

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"maxOutputTokens": 2048},
    }

    last_err: LLMProviderError | None = None
    for model_name in candidate_models:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
        )
        try:
            resp = _post_with_retry("gemini", lambda u=url: httpx.post(u, json=payload, timeout=TIMEOUT_SECONDS))
            text_val = _extract_gemini_text(resp.json())
            if text_val:
                return text_val
        except LLMProviderError as exc:
            last_err = exc
            if any(code in str(exc) for code in ("HTTP_404", "HTTP_503", "HTTP_429")):
                continue
            raise

    raise last_err or LLMProviderError("gemini", "EmptyResponse")


def _call_anthropic(system: str, user: str) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise LLMProviderError("anthropic", "MissingAPIKey")
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": settings.ANTHROPIC_MODEL,
        "max_tokens": 1024,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    resp = _post_with_retry(
        "anthropic",
        lambda: httpx.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=TIMEOUT_SECONDS),
    )
    data = resp.json()
    blocks = data.get("content") or []
    text_parts = [b.get("text", "") for b in blocks if isinstance(b, dict) and b.get("type") == "text"]
    text_val = "".join(text_parts).strip()
    if not text_val:
        raise LLMProviderError("anthropic", "EmptyResponse")
    return text_val


def completar_con_proveedor(provider: str, system: str, user: str) -> str:
    """Invoca un proveedor específico con interfaz unificada completar(system, user) -> str."""
    p = (provider or "local").strip().lower()
    if p == "ollama":
        return _call_ollama(system, user)
    if p == "groq":
        return _call_openai_compatible(
            "groq",
            "https://api.groq.com/openai/v1/chat/completions",
            settings.GROQ_API_KEY,
            settings.GROQ_MODEL,
            system,
            user,
        )
    if p == "gemini":
        return _call_gemini(system, user)
    if p == "openai":
        return _call_openai_compatible(
            "openai",
            "https://api.openai.com/v1/chat/completions",
            settings.OPENAI_API_KEY,
            settings.OPENAI_MODEL,
            system,
            user,
        )
    if p == "anthropic":
        return _call_anthropic(system, user)
    raise LLMProviderError(p, "LocalEngineSelected")


def completar(system: str, user: str) -> str:
    """Invoca el proveedor configurado en AI_PROVIDER."""
    return completar_con_proveedor(settings.AI_PROVIDER, system, user)
