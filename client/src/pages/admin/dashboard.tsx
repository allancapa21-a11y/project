import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Armchair, UserX, Grid2X2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { title: "Total Guests", value: data.totalGuests, icon: Users, color: "text-blue-600" },
    { title: "Seated", value: data.seatedGuests, icon: Armchair, color: "text-emerald-600" },
    { title: "Unseated", value: data.unseatedGuests, icon: UserX, color: "text-rose-600" },
    { title: "Total Tables", value: data.totalTables, icon: Grid2X2, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">A summary of your guest list and table assignments.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-muted shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-serif">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}><Icon className="h-6 w-6" /></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 border-muted shadow-sm">
          <CardHeader><CardTitle className="font-serif">Table Availability</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.tablesWithAvailability.map(table => (
                <div key={table.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{table.name}</span>
                    <span className="text-muted-foreground">{table.seatedCount} / {table.maxSeats} seated ({table.availableSeats} open)</span>
                  </div>
                  <Progress value={(table.seatedCount / table.maxSeats) * 100} className="h-2" />
                </div>
              ))}
              {data.tablesWithAvailability.length === 0 && (
                <p className="text-muted-foreground italic text-center py-4">No tables created yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted shadow-sm">
          <CardHeader><CardTitle className="font-serif">Occupancy Rate</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-muted">
              <div className="absolute inset-0 rounded-full border-8 border-primary"
                style={{ clipPath: `polygon(0 0, 100% 0, 100% ${data.occupancyRate}%, 0 ${data.occupancyRate}%)`, transform: 'rotate(-90deg)' }}
              />
              <div className="text-center space-y-1">
                <span className="text-4xl font-serif text-primary">{Math.round(data.occupancyRate)}%</span>
                <span className="block text-xs text-muted-foreground uppercase tracking-wider">Full</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
