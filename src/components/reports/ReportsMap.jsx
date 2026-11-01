import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, AlertCircle, DollarSign, Users } from "lucide-react";

const GROUP_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function FitBounds({ coords }) {
  const map = useMap();
  if (coords.length > 0) {
    const bounds = coords.map(c => [c.lat, c.lng]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }
  return null;
}

function LocationForm({ open, onClose, initialName, onSave }) {
  const [form, setForm] = useState({ name: initialName || "", lat: "", lng: "", description: "" });
  const [geocoding, setGeocoding] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const tryGeocode = async () => {
    if (!form.name) return;
    setGeocoding(true);
    const q = encodeURIComponent(`${form.name}, Mexico`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "es" }
    });
    const data = await res.json();
    if (data.length > 0) {
      set("lat", parseFloat(data[0].lat).toFixed(6));
      set("lng", parseFloat(data[0].lon).toFixed(6));
    }
    setGeocoding(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.lat || !form.lng) return;
    await base44.entities.Location.create({ ...form, lat: Number(form.lat), lng: Number(form.lng) });
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Agregar Ubicación con Coordenadas</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label>Nombre de ubicación *</Label>
            <div className="flex gap-2">
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Sector Norte" />
              <Button variant="outline" size="sm" onClick={tryGeocode} disabled={geocoding} className="shrink-0">
                {geocoding ? "..." : "Buscar"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">Debe coincidir exactamente con el nombre en los reportes</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Latitud *</Label>
              <Input type="number" step="0.000001" value={form.lat} onChange={e => set("lat", e.target.value)} placeholder="20.967370" />
            </div>
            <div className="space-y-1">
              <Label>Longitud *</Label>
              <Input type="number" step="0.000001" value={form.lng} onChange={e => set("lng", e.target.value)} placeholder="-89.623100" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.lat || !form.lng} className="bg-emerald-600 hover:bg-emerald-700">
            Guardar Ubicación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportsMap({ reports, groups, filterGroup }) {
  const qc = useQueryClient();
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [addLocationName, setAddLocationName] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list(),
  });

  // Group reports by location, computing totals
  const locationStats = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!r.location) return;
      if (!map[r.location]) map[r.location] = { name: r.location, totalCost: 0, reports: 0, groups: new Set() };
      map[r.location].totalCost += r.amount || 0;
      map[r.location].reports += 1;
      if (r.group) map[r.location].groups.add(r.group);
    });
    return Object.values(map);
  }, [reports]);

  // Match stats with known coordinates
  const mapped = useMemo(() => {
    return locationStats.map(ls => {
      const loc = locations.find(l => l.name?.toLowerCase() === ls.name?.toLowerCase());
      return { ...ls, lat: loc?.lat, lng: loc?.lng, groups: [...ls.groups] };
    });
  }, [locationStats, locations]);

  const withCoords = mapped.filter(l => l.lat && l.lng);
  const withoutCoords = mapped.filter(l => !l.lat || !l.lng);

  // Max cost for scaling circle size
  const maxCost = Math.max(...withCoords.map(l => l.totalCost), 1);

  const getRadius = (cost) => Math.max(10, Math.min(50, (cost / maxCost) * 45 + 10));

  const getColor = (groupList) => {
    if (groupList.length === 1) {
      const idx = groups.indexOf(groupList[0]);
      return GROUP_COLORS[idx >= 0 ? idx % GROUP_COLORS.length : 0];
    }
    return "#6366f1";
  };

  return (
    <div className="space-y-4">
      {/* Map */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        {withCoords.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-400 gap-3">
            <MapPin className="w-10 h-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Sin ubicaciones con coordenadas</p>
              <p className="text-xs text-slate-400 mt-1">Agrega coordenadas a las ubicaciones de tus reportes</p>
            </div>
            {withoutCoords.length > 0 && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2 mt-2" onClick={() => { setAddLocationName(withoutCoords[0].name); setShowLocationForm(true); }}>
                <Plus className="w-3.5 h-3.5" /> Agregar Coordenadas
              </Button>
            )}
          </div>
        ) : (
          <MapContainer
            center={[23.6, -102.5]}
            zoom={5}
            style={{ height: "420px", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds coords={withCoords} />
            {withCoords.map((loc) => (
              <CircleMarker
                key={loc.name}
                center={[loc.lat, loc.lng]}
                radius={getRadius(loc.totalCost)}
                pathOptions={{
                  fillColor: getColor(loc.groups),
                  fillOpacity: 0.75,
                  color: getColor(loc.groups),
                  weight: 2,
                }}
              >
                <Tooltip permanent={false} direction="top">
                  <span className="font-semibold">{loc.name}</span>
                </Tooltip>
                <Popup>
                  <div className="min-w-[180px] py-1">
                    <p className="font-bold text-slate-800 text-sm mb-2">{loc.name}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-slate-500">Costo acumulado:</span>
                        <span className="font-bold text-emerald-700">${loc.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-500">Reportes:</span>
                        <span className="font-semibold">{loc.reports}</span>
                      </div>
                      {loc.groups.length > 0 && (
                        <div className="text-xs text-slate-500 flex flex-wrap gap-1 mt-1">
                          {loc.groups.map(g => (
                            <span key={g} className="bg-slate-100 rounded px-1.5 py-0.5 font-medium">{g}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </Card>

      {/* Legend + Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Mapped locations summary */}
        {withCoords.length > 0 && (
          <Card className="p-4 border-slate-200 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Costo por Zona</h4>
            <div className="space-y-2">
              {withCoords.sort((a, b) => b.totalCost - a.totalCost).map(loc => (
                <div key={loc.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColor(loc.groups) }} />
                    <span className="text-sm text-slate-700 truncate">{loc.name}</span>
                    <span className="text-xs text-slate-400">{loc.reports} rep.</span>
                  </div>
                  <span className="font-semibold text-emerald-700 text-sm shrink-0">${loc.totalCost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Locations without coords */}
        {withoutCoords.length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50/50 shadow-sm">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Sin coordenadas ({withoutCoords.length})</h4>
            </div>
            <div className="space-y-1.5">
              {withoutCoords.map(loc => (
                <div key={loc.name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600 truncate">{loc.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    onClick={() => { setAddLocationName(loc.name); setShowLocationForm(true); }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Group color legend */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {groups.map((g, i) => (
            <div key={g} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }} />
              {g}
            </div>
          ))}
          {groups.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              Múltiples grupos
            </div>
          )}
        </div>
      )}

      <LocationForm
        open={showLocationForm}
        onClose={() => setShowLocationForm(false)}
        initialName={addLocationName}
        onSave={() => { qc.invalidateQueries({ queryKey: ["locations"] }); setShowLocationForm(false); }}
      />
    </div>
  );
}