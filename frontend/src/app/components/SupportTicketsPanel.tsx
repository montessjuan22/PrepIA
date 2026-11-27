import { useCallback, useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  apiGetAllSupportTickets,
  apiReplySupportTicket,
  apiUpdateSupportTicket,
  SupportTicketItem,
  SupportTicketsOverview,
} from "../../services/api";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Headphones,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserCheck,
} from "lucide-react";

const ESTADO_LABELS: Record<SupportTicketItem["estado"], string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const ESTADO_STYLES: Record<SupportTicketItem["estado"], string> = {
  pendiente: "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  en_proceso: "bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  resuelto: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  cerrado: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700",
};

const TIPO_LABELS: Record<SupportTicketItem["tipo_solicitud"], string> = {
  duda: "Duda",
  problema_tecnico: "Problema técnico",
  solicitud_funcion: "Solicitud de función",
  error: "Error / Bug",
};

export function SupportTicketsPanel() {
  const [data, setData] = useState<SupportTicketsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiGetAllSupportTickets(statusFilter);
      setData(res);
      setSelectedId((prev) => {
        if (prev && res.tickets.some((t) => t.id === prev)) return prev;
        return res.tickets[0]?.id ?? null;
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudieron cargar los tickets de soporte.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const tickets = (data?.tickets || []).filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.codigo.toLowerCase().includes(q) ||
      t.asunto.toLowerCase().includes(q) ||
      t.usuario_nombre.toLowerCase().includes(q) ||
      t.usuario_email.toLowerCase().includes(q)
    );
  });

  const selected = tickets.find((t) => t.id === selectedId) || tickets[0] || null;

  const handleUpdate = async (
    ticketId: number,
    payload: Parameters<typeof apiUpdateSupportTicket>[1]
  ) => {
    setBusy(true);
    setErrorMsg("");
    try {
      await apiUpdateSupportTicket(ticketId, payload);
      await loadTickets();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo actualizar el ticket.");
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    setErrorMsg("");
    try {
      await apiReplySupportTicket(selected.id, replyText.trim());
      setReplyText("");
      await loadTickets();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo enviar la respuesta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPIs de soporte */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Tickets", val: data?.stats.total ?? 0, color: "text-cyan-600 dark:text-cyan-400" },
          { label: "Pendientes", val: data?.stats.pendiente ?? 0, color: "text-amber-600 dark:text-amber-400" },
          { label: "En proceso", val: data?.stats.en_proceso ?? 0, color: "text-blue-600 dark:text-blue-400" },
          { label: "Resueltos", val: data?.stats.resuelto ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Cerrados", val: data?.stats.cerrado ?? 0, color: "text-gray-600 dark:text-slate-400" },
        ].map((k) => (
          <Card key={k.label} className="p-3.5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
            <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código (SUP-), asunto o usuario..."
              className="pl-9 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { k: "todos", l: "Todos" },
              { k: "pendiente", l: "Pendientes" },
              { k: "en_proceso", l: "En proceso" },
              { k: "resuelto", l: "Resueltos" },
              { k: "cerrado", l: "Cerrados" },
            ].map((f) => (
              <Button
                key={f.k}
                size="sm"
                variant={statusFilter === f.k ? "default" : "outline"}
                onClick={() => setStatusFilter(f.k)}
              >
                {f.l}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={loadTickets} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista + Detalle */}
      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5 p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-2.5 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Headphones className="w-4 h-4 text-cyan-500" />
              Cola de Tickets ({tickets.length})
            </h4>
          </div>

          {tickets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
              {loading ? "Cargando tickets..." : "No hay tickets registrados con este filtro."}
            </p>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  selected?.id === t.id
                    ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30"
                    : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-300">
                    {t.codigo}
                  </span>
                  <Badge className={`text-[10px] border ${ESTADO_STYLES[t.estado]}`}>
                    {ESTADO_LABELS[t.estado]}
                  </Badge>
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{t.asunto}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                  {t.usuario_nombre} · {TIPO_LABELS[t.tipo_solicitud]} · {t.mensajes_count} msgs
                </p>
                {t.agente_nombre && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Asignado a: {t.agente_nombre}
                  </p>
                )}
              </button>
            ))
          )}
        </Card>

        <Card className="lg:col-span-7 p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
          {!selected ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
              Selecciona un ticket para revisar los detalles, asignarlo o responder al usuario.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-gray-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {selected.codigo}
                    </span>
                    <Badge variant="outline" className="text-[11px]">
                      {TIPO_LABELS[selected.tipo_solicitud]}
                    </Badge>
                    <Badge className={`text-[11px] border ${ESTADO_STYLES[selected.estado]}`}>
                      {ESTADO_LABELS[selected.estado]}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{selected.asunto}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Solicitante: <span className="font-medium">{selected.usuario_nombre}</span> ({selected.usuario_email}) · Rol: {selected.usuario_rol}
                  </p>
                </div>

                {data?.viewer && selected.agente_id !== data.viewer.id && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => handleUpdate(selected.id, { agente_id: data.viewer.id })}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    Tomar ticket
                  </Button>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                {selected.descripcion}
              </div>

              {/* Controles de gestión */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    Estado
                  </label>
                  <select
                    disabled={busy}
                    value={selected.estado}
                    onChange={(e) =>
                      handleUpdate(selected.id, { estado: e.target.value as SupportTicketItem["estado"] })
                    }
                    className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    Prioridad
                  </label>
                  <select
                    disabled={busy}
                    value={selected.prioridad}
                    onChange={(e) =>
                      handleUpdate(selected.id, { prioridad: e.target.value as SupportTicketItem["prioridad"] })
                    }
                    className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    Agente asignado
                  </label>
                  <select
                    disabled={busy}
                    value={selected.agente_id ? String(selected.agente_id) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        handleUpdate(selected.id, { desasignar_agente: true });
                      } else {
                        handleUpdate(selected.id, { agente_id: Number(val) });
                      }
                    }}
                    className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  >
                    <option value="">Sin asignar</option>
                    {(data?.agents || []).map((ag) => (
                      <option key={ag.id} value={String(ag.id)}>
                        {ag.nombre} ({ag.es_admin_principal ? "Superadmin" : "Soporte"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hilo de mensajes */}
              <div className="space-y-2.5 pt-2 border-t border-gray-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Conversación ({selected.mensajes?.length ?? 0})
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(selected.mensajes || []).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic">
                      Aún no hay respuestas en este ticket.
                    </p>
                  ) : (
                    (selected.mensajes || []).map((m) => {
                      const isAgentMsg = m.autor_rol === "agente_soporte" || m.autor_es_superadmin;
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl text-xs border ${
                            isAgentMsg
                              ? "bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900"
                              : "bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {m.autor_nombre}{" "}
                              {m.autor_es_superadmin
                                ? "(Superadmin / Soporte)"
                                : m.autor_rol === "agente_soporte"
                                  ? "(Agente de Soporte)"
                                  : ""}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {m.created_at ? m.created_at.slice(0, 16).replace("T", " ") : ""}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{m.mensaje}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleReply} className="space-y-2 pt-2">
                  <Textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe una respuesta para el usuario..."
                    className="dark:bg-slate-900 dark:border-slate-700 text-sm"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || selected.estado === "resuelto"}
                      onClick={() => handleUpdate(selected.id, { estado: "resuelto" })}
                      className="text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Marcar resuelto
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={busy || !replyText.trim()}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Enviar respuesta
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
