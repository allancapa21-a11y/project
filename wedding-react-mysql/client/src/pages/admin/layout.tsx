import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Info } from "lucide-react";

export default function LayoutEditorPage() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTable, setDraggingTable] = useState<number | null>(null);
  const defaultW = 15, defaultH = 10;

  const { data: tables, isLoading } = useQuery({ queryKey: ["tables"], queryFn: api.listTables });
  const updateTable = useMutation({ mutationFn: ({ id, data }: any) => api.updateTable(id, data) });

  const handlePointerDown = (e: React.PointerEvent, id: number) => {
    e.preventDefault();
    setDraggingTable(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTable || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(100 - defaultW, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100 - defaultH, ((e.clientY - rect.top) / rect.height) * 100));
    queryClient.setQueryData(["tables"], (old: any) =>
      old?.map((t: any) => t.id === draggingTable ? { ...t, posX: x, posY: y, posWidth: defaultW, posHeight: defaultH } : t)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingTable) return;
    const table = (queryClient.getQueryData(["tables"]) as any[])?.find((t: any) => t.id === draggingTable);
    if (table) updateTable.mutate({ id: table.id, data: { posX: table.posX ?? 10, posY: table.posY ?? 10, posWidth: defaultW, posHeight: defaultH } });
    setDraggingTable(null);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Floor Plan</h1>
        <p className="text-muted-foreground mt-1">Drag tables to arrange them visually.</p>
      </div>
      <div className="bg-blue-50 text-blue-800 p-4 rounded-md border border-blue-200 flex gap-3 text-sm">
        <Info className="h-5 w-5 shrink-0" />
        <p>This layout is for your reference only and will not be shown to guests.</p>
      </div>
      <div ref={canvasRef} className="w-full aspect-[4/3] bg-card border-2 border-dashed border-muted-foreground/20 rounded-xl relative overflow-hidden"
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-[0.03] pointer-events-none">
          {Array.from({ length: 144 }).map((_, i) => <div key={i} className="border-[0.5px] border-foreground" />)}
        </div>
        {tables?.map((table: any, i: number) => {
          const x = table.posX ?? (5 + (i % 5) * 18);
          const y = table.posY ?? (5 + Math.floor(i / 5) * 15);
          const w = table.posWidth ?? defaultW;
          const h = table.posHeight ?? defaultH;
          return (
            <div key={table.id} onPointerDown={(e) => handlePointerDown(e, table.id)}
              className={`absolute flex flex-col items-center justify-center rounded-full border-2 bg-background shadow-sm select-none touch-none transition-shadow ${
                draggingTable === table.id ? "border-primary shadow-lg scale-105 z-50 cursor-grabbing" : "border-muted-foreground/30 hover:border-primary/50 cursor-grab"
              }`}
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}>
              <span className="font-serif font-medium text-center px-2 line-clamp-1 text-sm">{table.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase">{table.maxSeats} seats</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
