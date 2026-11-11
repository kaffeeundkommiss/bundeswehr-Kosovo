# Erzeugt Umriss-Logo und Übersichtskarte des Kosovo aus Natural Earth (gemeinfrei).
# Eingabe: Ordner mit a0.geojson (ne_10m_admin_0_countries) und pp.geojson (ne_10m_populated_places_simple)
# aus https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
# Aufruf: python3 werkzeuge/karten.py <ordner> <zielordner>
import json, math, sys, os
NE, OUT = sys.argv[1], sys.argv[2]
a0 = json.load(open(os.path.join(NE, 'a0.geojson')))
pp = json.load(open(os.path.join(NE, 'pp.geojson')))
def land(code):
    for f in a0['features']:
        if f['properties']['ADM0_A3'] == code: return f['geometry']
def rings(g):
    if g['type'] == 'Polygon': return g['coordinates']
    return [r for poly in g['coordinates'] for r in poly]
def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1,y1),(x2,y2) = pts[0], pts[-1]
    dx,dy = x2-x1, y2-y1; L = math.hypot(dx,dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        x,y = pts[i]; d = abs(dy*x-dx*y+x2*y1-y2*x1)/L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]
def pfad(g, proj, eps):
    out = []
    for r in rings(g):
        pts = [proj(*c[:2]) for c in r]
        m = len(pts)//2
        s = dp(pts[:m+1], eps)[:-1] + dp(pts[m:], eps)
        if len(s) < 3: continue
        out.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x,y in s) + 'Z')
    return ''.join(out)
K = math.cos(math.radians(42.6))
kos = land('KOS')
xs = [c[0] for r in rings(kos) for c in r]; ys = [c[1] for r in rings(kos) for c in r]
lon0, lon1, lat0, lat1 = min(xs), max(xs), min(ys), max(ys)
# Logo: 64 x 64, Rand 5
w, h = (lon1-lon0)*K, lat1-lat0
s = 54/max(w, h)
ox, oy = (64-w*s)/2, (64-h*s)/2
logo = pfad(kos, lambda lon,lat: (ox+(lon-lon0)*K*s, oy+(lat1-lat)*s), 0.35)
open(os.path.join(OUT, 'logo-pfad.txt'), 'w').write(logo)
# Karte: Ausschnitt mit Nachbarn
B = (19.9, 22.2, 41.75, 43.35)  # lon min, lon max, lat min, lat max
S = 300
W, H = (B[1]-B[0])*K*S, (B[3]-B[2])*S
pk = lambda lon,lat: ((lon-B[0])*K*S, (B[3]-lat)*S)
teile = []
for code, name in [('SRB','Serbien'),('ALB','Albanien'),('MKD','Nordmazedonien'),('MNE','Montenegro')]:
    teile.append(f'<path class="nachbar" d="{pfad(land(code), pk, 0.6)}"><title>{name}</title></path>')
teile.append(f'<path class="kosovo" d="{pfad(kos, pk, 0.6)}"><title>Kosovo</title></path>')
orte = {'Pristina': 'Pristina', 'Prizren': 'Prizren', 'Pec': 'Peja'}
punkte = {}
for f in pp['features']:
    p = f['properties']
    if p['name'] in orte and p.get('adm0name') == 'Kosovo':
        punkte[orte[p['name']]] = pk(p['longitude'], p['latitude'])
json.dump({'breite': round(W), 'hoehe': round(H), 'pfade': ''.join(teile), 'orte': {k: [round(v[0],1), round(v[1],1)] for k,v in punkte.items()}},
          open(os.path.join(OUT, 'karte.json'), 'w'), ensure_ascii=False)
print(round(W), round(H), punkte)
