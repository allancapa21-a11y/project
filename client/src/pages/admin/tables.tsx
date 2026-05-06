import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function TablesPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [name, setName] = useState("");
  const [maxSeats, setMaxSeats] = useState(8);
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({ queryKey: ["tables"], queryFn: api.listTables });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["tables"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); };
  const createTable = useMutation({ mutationFn: (data: { name: string; maxSeats: number }) => api.createTable(data), onSuccess: () => { setIsAddOpen(false); setName(""); setMaxSeats(8); invalidate(); } });
  const updateTable = useMutation({ mutationFn: ({ id, data }: any) => api.updateTable(id, data), onSuccess: () => { setEditingTable(null); setName(""); setMaxSeats(8); invalidate(); } });
  const deleteTable = useMutation({ mutationFn: (id: number) => api.deleteTable(id), onSuccess: invalidate });

  const handleCreate = () => { if (name.trim()) createTable.mutate({ name, maxSeats }); };
  const handleUpdate = () => { if (editingTable && name.trim()) updateTable.mutate({ id: editingTable.id, data: { name, maxSeats } }); };
  const handleDelete = (id: number) => { if (confirm("Delete this table? Guests assigned to it will be unassigned.")) deleteTable.mutate(id); };
  const openEdit = (table: any) => { setEditingTable(table); setName(table.name); setMaxSeats(table.maxSeats); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Tables</h1>
          <p className="text-muted-foreground mt-1">Manage tables and capacities.</p>
        </div>
        <Button onClick={() => { setName(""); setMaxSeats(8); setIsAddOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Table</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tables...</div>
      ) : tables?.length === 0 ? (
        <div className="text-center py-12 border rounded-md border-dashed border-muted-foreground/30 text-muted-foreground">No tables created yet. Click "Add Table" to begin.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables?.map((table: any) => (
            <Card key={table.id} className="border-muted shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <CardTitle className="font-serif text-xl text-primary">{table.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(table)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(table.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-2"><Users className="h-4 w-4 mr-2" />{table.seatedCount} / {table.maxSeats} Seats Filled</div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Assigned Guests</h4>
                {table.guests.length > 0 ? (
                  <ul className="space-y-2">
                    {table.guests.map((g: any) => (
                      <li key={g.id} className="flex justify-between items-center text-sm">
                        <span className="font-serif">{g.name}</span>
                        <span className="text-muted-foreground text-xs">{g.seatNumber ? `Seat ${g.seatNumber}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm italic text-muted-foreground">No guests assigned.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen || !!editingTable} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); setEditingTable(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Table Name / Number</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Table 1, Head Table" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Seats</label>
              <Input type="number" min={1} value={maxSeats} onChange={e => setMaxSeats(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingTable(null); }}>Cancel</Button>
            <Button onClick={editingTable ? handleUpdate : handleCreate} disabled={!name.trim()}>{editingTable ? "Save Changes" : "Create Table"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
