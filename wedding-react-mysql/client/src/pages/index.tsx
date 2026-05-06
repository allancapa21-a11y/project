import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Guest, Table } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, QrCode, X, MapPin } from "lucide-react";

interface LookupResult { guest: Guest; table: Table | null; }

export default function IndexPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<any>(null);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  const { data: result, isLoading, isError, error } = useQuery<LookupResult>({
    queryKey: ["lookup", submitted],
    queryFn: () => api.lookupGuest(submitted),
    enabled: !!submitted,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  const handleReset = () => { setQuery(""); setSubmitted(""); };

  const startScanner = async () => {
    setShowScanner(true);
    setTimeout(async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
        scannerRef.current = scanner;
        scanner.render(
          (decodedText: string) => {
            const url = new URL(decodedText);
            const code = url.searchParams.get("q") || decodedText;
            setQuery(code); setSubmitted(code); setShowScanner(false);
            scanner.clear().catch(() => {});
          },
          () => {}
        );
      } catch {}
    }, 100);
  };

  const stopScanner = () => {
    scannerRef.current?.clear().catch(() => {});
    setShowScanner(false);
  };

  const eventName = settings?.eventName || "Our Wedding";
  const eventDate = settings?.eventDate
    ? new Date(settings.eventDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-serif text-primary leading-tight">{eventName}</h1>
          {eventDate && <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{eventDate}</p>}
        </div>

        {!submitted && !showScanner && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
            <p className="text-center text-muted-foreground">Enter your name or personal code to find your seat.</p>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Name or Code..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!query.trim()}>
                Find My Seat
              </Button>
            </form>
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t"/></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>
            <Button variant="outline" className="w-full gap-2" onClick={startScanner}>
              <QrCode className="h-4 w-4" /> Scan QR Code from Invitation
            </Button>
          </div>
        )}

        {showScanner && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-medium">Point camera at your QR code</p>
              <Button variant="ghost" size="icon" onClick={stopScanner}><X className="h-4 w-4" /></Button>
            </div>
            <div id="qr-reader" className="w-full" />
          </div>
        )}

        {submitted && isLoading && (
          <div className="text-center text-muted-foreground py-8">Searching...</div>
        )}

        {submitted && isError && (
          <div className="bg-card border border-destructive/20 rounded-xl p-8 text-center space-y-4">
            <p className="text-destructive font-medium">Guest not found</p>
            <p className="text-sm text-muted-foreground">No guest matched "{submitted}". Please check your name or code and try again.</p>
            <Button variant="outline" onClick={handleReset}>Try Again</Button>
          </div>
        )}

        {result && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-primary/10 p-6 text-center border-b">
              <p className="text-sm text-muted-foreground mb-1">Welcome,</p>
              <h2 className="text-3xl font-serif text-primary">{result.guest.name}</h2>
            </div>
            <div className="p-6 text-center space-y-2">
              {result.table ? (
                <>
                  <p className="text-muted-foreground text-sm">Your seat is at</p>
                  <div className="text-4xl font-serif text-foreground py-2">{result.table.name}</div>
                  {result.guest.seatNumber && (
                    <p className="text-lg text-muted-foreground">Seat <span className="text-foreground font-medium">{result.guest.seatNumber}</span></p>
                  )}
                  {result.table.posX !== null && result.table.posX !== undefined && (
                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> Floor Plan</p>
                      <div className="relative w-full aspect-[4/3] bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
                        <div
                          className="absolute bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full font-serif font-medium shadow-md"
                          style={{ left: `${result.table.posX}%`, top: `${result.table.posY}%`, width: `${result.table.posWidth ?? 15}%`, height: `${result.table.posHeight ?? 10}%` }}
                        >
                          {result.table.name}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic py-4">Your seat has not been assigned yet. Please check with the wedding coordinator.</p>
              )}
            </div>
            <div className="p-4 border-t text-center">
              <Button variant="ghost" className="text-sm text-muted-foreground" onClick={handleReset}>Search Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
