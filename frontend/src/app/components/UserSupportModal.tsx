import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  apiCreateSupportTicket,
  apiGetMySupportTickets,
  apiReplySupportTicket,
  SupportTicketItem,
} from "../../services/api";
import { AlertCircle, Headphones, Plus, Send, X } from "lucide-react";

interface UserSupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserSupportModal({ open, onClose }: UserSupportModalProps) {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<SupportTicketItem["tipo_solicitud"]>("duda");
  const [prioridad, setPrioridad] = useState<SupportTicketItem["prioridad"]>("media");
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadMine = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const list = await apiGetMySupportTickets();
      setTickets(list);
      setSelectedId((prev) => (prev && list.some((t) => t.id === prev) ? prev : list[0]?.id ?? null));
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudieron cargar tus tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMine();
    }
  }, [open, loadMine]);

  if (!open) return null;

  const selected = tickets.find((t) => t.id === selectedId) || null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !descripcion.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const created = await apiCreateSupportTicket({
        tipo_solicitud: tipo,
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
        prioridad,
      });
      setAsunto("");
      setDescripcion("");
      await loadMine();
      setSelectedId(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo crear el ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await apiReplySupportTicket(selected.id, replyText.trim());
      setReplyText("");
      await loadMine();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Centro de Soporte PrepIA</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Envía solicitudes o reporta fallos al equipo de Soporte y Superadmin
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto grid md:grid-cols-2 gap-6">
          {/* Nuevo Ticket */}
          <form onSubmit={handleCreate} className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-500" />
              Nueva solicitud de soporte
            </h4>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="duda">Duda</option>
                  <option value="problema_tecnico">Problema técnico</option>
                  <option value="error">Error</option>
                  <option value="solicitud_funcion">Solicitud de función</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Asunto *</label>
              <Input
                required
                minLength={4}
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Problema al cargar mi hoja de vida"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Descripción *</label>
              <Textarea
                required
                minLength={8}
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué ocurrió y cómo ayudarte..."
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
              {submitting ? "Enviando..." : "Enviar Ticket"}
            </Button>
          </form>

          {/* Mis Tickets */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              Mis Tickets ({tickets.length})
            </h4>

            {loading ? (
              <p className="text-xs text-gray-500">Cargando...</p>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-slate-400">
                No has enviado tickets de soporte todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs cursor-pointer ${
                      selected?.id === t.id
                        ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30"
                        : "border-gray-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{t.codigo}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {t.estado}
                      </Badge>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white truncate mt-0.5">{t.asunto}</p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 space-y-2.5">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{selected.asunto}</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">{selected.descripcion}</p>
                <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
                  {(selected.mensajes || []).map((m) => (
                    <div key={m.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs">
                      <span className="font-semibold">{m.autor_nombre}: </span>
                      <span>{m.mensaje}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleReply} className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Responder en este ticket..."
                    className="h-8 text-xs dark:bg-slate-900 dark:border-slate-700"
                  />
                  <Button type="submit" size="sm" disabled={submitting || !replyText.trim()} className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
