import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Plane, Calendar, Users, Loader2, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  infants: number;
  status: string;
  created_at: string;
}

export default function Trips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching trips:', error);
        throw error;
      }
      
      console.log('Fetched trips:', data?.length || 0);
      setTrips(data || []);
    } catch (error: any) {
      console.error('Failed to load trips:', error);
      toast.error('Unable to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'planning':
        return <Badge variant="default" className="bg-amber-500/20 text-amber-700 border-amber-500/30">Planning</Badge>;
      case 'complete':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Complete</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTotalPassengers = (trip: Trip) => {
    return trip.adults + trip.children + trip.infants;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Your Trips</h1>
              <p className="text-muted-foreground mt-1 font-body">
                Continue planning or start a new journey
              </p>
            </div>
            <Button variant="premium" onClick={() => navigate('/trip/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Trip
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty state */}
          {!loading && trips.length === 0 && (
            <Card variant="elevated" className="text-center py-16">
              <CardContent>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Plane className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  No trips yet
                </h2>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto font-body">
                  Start planning your first journey. We'll help you orchestrate every detail with calm precision.
                </p>
                <Button variant="premium" onClick={() => navigate('/trip/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Plan Your First Trip
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Trips grid */}
          {!loading && trips.length > 0 && (
            <div className="grid gap-4">
              {trips.map((trip) => (
                <Link key={trip.id} to={`/trip/${trip.id}`}>
                  <Card 
                    variant="elevated" 
                    className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {trip.origin_city} → {trip.destination_city}
                            </h3>
                            {getStatusBadge(trip.status)}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(trip.departure_date), 'MMM d')} - {format(new Date(trip.return_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {getTotalPassengers(trip)} {getTotalPassengers(trip) === 1 ? 'traveler' : 'travelers'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm text-muted-foreground">
                            Created {format(new Date(trip.created_at), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
