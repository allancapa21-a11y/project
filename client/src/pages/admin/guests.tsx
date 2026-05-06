import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Search, Trash2, Edit2, ChevronDown, QrCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { QRCodeCanvas } from "qrcode.react";

export default function GuestsPage() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [assigningGuest, setAssigningGuest] = useState<any>(null);
  const [qrGuest, setQrGuest] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: guests, isLoading } = useQuery({ queryKey: ["guests", search], queryFn: () => api.listGuests({ search }) });
  const { data: tables } = useQuery({ queryKey: ["tables"], queryFn: api.listTables });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["guests"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  };

  const createGuest = useMutation({ mutationFn: (data: { name: string }) => api.createGuest(data), onSuccess: () => { setIsAddOpen(false); setNewName(""); invalidate(); } });
  const updateGuest = useMutation({ mutationFn: ({ id, data }: any) => api.updateGuest(id, data), onSuccess: () => { setEditingGuest(null); setNewName(""); invalidate(); } });
  const deleteGuest = useMutation({ mutationFn: (id: number) => api.deleteGuest(id), onSuccess: invalidate });
  const assignSeat = useMutation({ mutationFn: ({ id, data }: any) => api.assignSeat(id, data), onSuccess: () => { setAssigningGuest(null); invalidate(); } });

  const handleCreate = () => { if (newName.trim()) createGuest.mutate({ name: newName }); };
  const handleUpdate = () => { if (editingGuest && newName.trim()) updateGuest.mutate({ id: editingGuest.id, data: { name: newName } }); };
  const handleDelete = (id: number) => { if (confirm("Delete this guest?")) deleteGuest.mutate(id); };
  const handleAssign = () => { if (assigningGuest) assignSeat.mutate({ id: assigningGuest.id, data: { tableId: selectedTableId, seatNumber: selectedSeat } }); };
  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas || !qrGuest) return;
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/png");
    a.download = `qr-${qrGuest.code}-${qrGuest.name.replace(/\s+/g, "-")}.png`; a.click();
  };
  const getGuestQrUrl = (code: string) => `${window.location.origin}/?q=${code}`;
  const selectedTable = tables?.find((t: any) => t.id === selectedTableId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Guest List</h1>
          <p className="text-muted-foreground mt-1">Manage attendees and seating assignments.</p>
        </div>
        <Button onClick={() => { setNewName(""); setIsAddOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Guest</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search guests by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <div className="border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Table</TableHead><TableHead>Seat</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading guests...</TableCell></TableRow>
            ) : guests?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No guests found.</TableCell></TableRow>
            ) : guests?.map((guest: any) => (
              <TableRow key={guest.id}>
                <TableCell className="font-medium font-serif">{guest.name}</TableCell>
                <TableCell><code className="bg-muted px-2 py-1 rounded text-xs">{guest.code}</code></TableCell>
                <TableCell>
                  {guest.tableName ? (
                    <Badge variant="outline" className="font-serif bg-primary/5 border-primary/20 text-primary">{guest.tableName}</Badge>
                  ) : <span className="text-muted-foreground text-sm italic">Unassigned</span>}
                </TableCell>
                <TableCell>{guest.seatNumber || "-"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setAssigningGuest(guest); setSelectedTableId(guest.tableId); setSelectedSeat(guest.seatNumber); }}>Assign Seat</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setQrGuest(guest)}><QrCode className="h-4 w-4 mr-2" /> View QR Code</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingGuest(guest); setNewName(guest.name); }}><Edit2 className="h-4 w-4 mr-2" /> Edit Name</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(guest.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen || !!editingGuest} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); setEditingGuest(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGuest ? "Edit Guest" : "Add New Guest"}</DialogTitle></DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-1 block">Full Name</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Jane Doe" autoFocus onKeyDown={e => e.key === "Enter" && (editingGuest ? handleUpdate() : handleCreate())} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingGuest(null); }}>Cancel</Button>
            <Button onClick={editingGuest ? handleUpdate : handleCreate} disabled={!newName.trim()}>{editingGuest ? "Save Changes" : "Add Guest"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigningGuest} onOpenChange={(open) => !open && setAssigningGuest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Seat for {assigningGuest?.name}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Table</label>
              <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedTableId || ""} onChange={(e) => { setSelectedTableId(e.target.value ? Number(e.target.value) : null); setSelectedSeat(null); }}>
                <option value="">Unassigned</option>
                {tables?.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.seatedCount}/{t.maxSeats} full)</option>)}
              </select>
            </div>
            {selectedTable && (
              <div>
                <label className="text-sm font-medium mb-1 block">Seat Number (1–{(selectedTable as any).maxSeats})</label>
                <Input type="number" min={1} max={(selectedTable as any).maxSeats} value={selectedSeat || ""} onChange={e => setSelectedSeat(e.target.value ? Number(e.target.value) : null)} placeholder="Optional" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningGuest(null)}>Cancel</Button>
            <Button onClick={handleAssign}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrGuest} onOpenChange={(open) => !open && setQrGuest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR Code — {qrGuest?.name}</DialogTitle></DialogHeader>
          <div className="py-4 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">Guests scan this to go straight to their seating result.</p>
            <div ref={qrRef} className="p-4 bg-white rounded-lg border shadow-sm">
              {qrGuest && <QRCodeCanvas value={getGuestQrUrl(qrGuest.code)} size={200} level="M" includeMargin />}
            </div>
            <div className="text-center">
              <code className="text-xs bg-muted px-2 py-1 rounded">{qrGuest?.code}</code>
              <p className="text-xs text-muted-foreground mt-1 break-all">{qrGuest && getGuestQrUrl(qrGuest.code)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrGuest(null)}>Close</Button>
            <Button onClick={handleDownloadQr} className="gap-2"><Download className="h-4 w-4" /> Download PNG</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
