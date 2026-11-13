// Dust Collection Explorer: Conklin laminate shop, 75 Appleton St.
// Built from the explainer video's scene (machines.glb, shop_interior.glb, collector.glb, scene.json)
// plus controls.json (wall controls, one state machine) and procedures.json (training steps).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSim } from './sim.js';

const Q = new URLSearchParams(location.search);
const LANGS = ['en', 'es', 'fr', 'sw'];
const $ = (s, r = document) => r.querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = t => t * t * (3 - 2 * t);
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease in-out cubic
let RM = Q.get('rm') === '1'; // prefers-reduced-motion: no camera flights, no swirl, no pulses
try { RM = RM || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
const L4 = (en, es, fr, sw) => ({ en, es, fr, sw });

// ---------------------------------------------------------------- language
let LANG = 'all';
try { LANG = localStorage.getItem('dce_lang') || 'all'; } catch (e) { /* storage blocked */ }
if (Q.get('lang')) LANG = Q.get('lang');
const tx = (o, l) => (o == null ? '' : typeof o === 'string' ? o : (o[l] ?? o.en ?? ''));
function t4(o, cls = '') {
  if (o == null) return '';
  if (typeof o === 'string') o = { en: o };
  if (LANG !== 'all') return `<span class="t4 single ${cls}"><span class="en">${esc(tx(o, LANG))}</span></span>`;
  let h = `<span class="t4 ${cls}"><span class="en">${esc(o.en)}</span>`;
  for (const l of ['es', 'fr', 'sw']) {
    if (o[l] && o[l] !== o.en) h += `<span class="ln ${l}"><b>${l.toUpperCase()}</b>${esc(o[l])}</span>`;
  }
  return h + '</span>';
}
function b4(o) { // compact button label: English line + one small line of the others
  if (typeof o === 'string') o = { en: o };
  if (LANG !== 'all') return esc(tx(o, LANG));
  const rest = ['es', 'fr', 'sw'].filter(l => o[l] && o[l] !== o.en).map(l => `<span>${esc(o[l])}</span>`).join('');
  return `${esc(o.en)}${rest ? `<span class="l4">${rest}</span>` : ''}`;
}
const U = {
  sub: { en: 'Conklin laminate shop, 75 Appleton St', es: 'Taller de laminado Conklin, 75 Appleton St', fr: 'Atelier de stratifié Conklin, 75 Appleton St', sw: 'Karakana ya laminati ya Conklin, 75 Appleton St' },
  all: { en: 'All', es: 'Todos', fr: 'Toutes', sw: 'Zote' },
  view: { en: 'View', es: 'Vista', fr: 'Vue', sw: 'Mwonekano' },
  orbit: { en: 'Orbit', es: 'Órbita', fr: 'Orbite', sw: 'Zunguka' },
  walk: { en: 'Walk', es: 'Caminar', fr: 'Marcher', sw: 'Tembea' },
  tour: { en: "Guided tour", es: "Recorrido guiado", fr: "Visite guidée", sw: "Ziara ya kuongozwa" },
  back: { en: 'Back', es: 'Atrás', fr: 'Retour', sw: 'Nyuma' },
  next: { en: 'Next', es: 'Siguiente', fr: 'Suivant', sw: 'Mbele' },
  system: { en: 'System', es: 'Sistema', fr: 'Système', sw: 'Mfumo' },
  on: { en: 'ON', es: 'Encendido', fr: 'Marche', sw: 'Washa' },
  off: { en: 'OFF', es: 'Apagado', fr: 'Arrêt', sw: 'Zima' },
  reset_scene: { en: 'Reset scene', es: 'Restablecer escena', fr: 'Réinitialiser la scène', sw: 'Rudisha mandhari' },
  show: { en: 'Show', es: 'Mostrar', fr: 'Afficher', sw: 'Onyesha' },
  xray: { en: "See-through ducts", es: "Ductos transparentes", fr: "Gaines transparentes", sw: "Mabomba ya kuona ndani" },
  shed_walls: { en: 'Shed walls', es: 'Paredes de la caseta', fr: "Murs de l'abri", sw: 'Kuta za kibanda' },
  shed_roof: { en: 'Shed roof', es: 'Techo de la caseta', fr: "Toit de l'abri", sw: 'Paa la kibanda' },
  shop_wall: { en: 'Shop walls', es: 'Paredes del taller', fr: "Murs de l'atelier", sw: 'Kuta za karakana' },
  shop_roof: { en: 'Shop roof', es: 'Techo del taller', fr: "Toit de l'atelier", sw: 'Paa la karakana' },
  labels: { en: 'Labels', es: 'Etiquetas', fr: 'Étiquettes', sw: 'Lebo' },
  sound: { en: 'Sound', es: 'Sonido', fr: 'Son', sw: 'Sauti' },
  sections: { en: "Open it up", es: "Ver por dentro", fr: "Voir l'intérieur", sw: "Ona ndani" },
  ducts: { en: 'Ducts', es: 'Ductos', fr: 'Gaines', sw: 'Mabomba' },
  exploded: { en: "Take it apart", es: "Desarmar", fr: "Démonter", sw: "Tenganisha" },
  close_all: { en: 'Close all', es: 'Cerrar todo', fr: 'Tout fermer', sw: 'Funga zote' },
  flamex: { en: "Spark safety (Flamex)", es: "Seguridad contra chispas (Flamex)", fr: "Sécurité étincelles (Flamex)", sw: "Usalama wa cheche (Flamex)" },
  flamex_run: { en: "Show a spark: zone A, then B", es: "Mostrar una chispa: zona A, luego B", fr: "Montrer une étincelle : zone A, puis B", sw: "Onyesha cheche: eneo A, kisha B" },
  follow: { en: 'Camera follows', es: 'La cámara sigue', fr: 'La caméra suit', sw: 'Kamera inafuata' },
  training: { en: "Practice on the real controls", es: "Practique con los mandos reales", fr: "S'exercer sur les vraies commandes", sw: "Jizoeze kwa vidhibiti halisi" },
  procedures: { en: "Step-by-step practice", es: "Práctica paso a paso", fr: "Exercice pas à pas", sw: "Mazoezi hatua kwa hatua" },
  p_collector: { en: "Start/stop wall (behind CNC 2)", es: "Pared de arranque (detrás del CNC 2)", fr: "Mur marche/arrêt (derrière la CNC 2)", sw: "Ukuta wa kuwasha (nyuma ya CNC 2)" },
  p_outside: { en: "Outside shut-offs (by the shed)", es: "Cortes exteriores (junto a la caseta)", fr: "Coupures extérieures (près de l'abri)", sw: "Vizima vya nje (karibu na kibanda)" },
  p_gates: { en: "Blast gate panel", es: "Panel de compuertas", fr: "Panneau des vannes", sw: "Paneli ya vali" },
  p_fxA: { en: "Flamex panel, zone A", es: "Panel Flamex, zona A", fr: "Panneau Flamex, zone A", sw: "Paneli ya Flamex, eneo A" },
  p_fxB: { en: "Flamex panel, zone B", es: "Panel Flamex, zona B", fr: "Panneau Flamex, zone B", sw: "Paneli ya Flamex, eneo B" },
  running: { en: 'Running', es: 'En marcha', fr: 'En marche', sw: 'Inafanya kazi' },
  stopped: { en: 'Stopped', es: 'Detenido', fr: 'Arrêté', sw: 'Imesimama' },
  coasting: { en: 'Coasting', es: 'Por inercia', fr: 'Sur son élan', sw: 'Inapunguza kasi' },
  locked: { en: 'Locked out', es: 'Bloqueado', fr: 'Consigné', sw: 'Imefungwa' },
  nopower: { en: 'No power', es: 'Sin energía', fr: 'Hors tension', sw: 'Hakuna umeme' },
  latched_nopower: { en: "Started, but no power", es: "Arrancado, pero sin energía", fr: "Démarré, mais sans courant", sw: "Imewashwa, lakini hakuna umeme" },
  fan_s: { en: 'Main fan', es: 'Ventilador', fr: 'Ventilateur', sw: 'Feni kuu' },
  blower_s: { en: 'Transfer blower', es: 'Soplador', fr: 'Transfert', sw: 'Kipuliza' },
  airlock_s: { en: 'Airlock', es: 'Válvula rotativa', fr: 'Écluse', sw: 'Vali' },
  gates_s: { en: 'Gates open', es: 'Compuertas abiertas', fr: 'Vannes ouvertes', sw: 'Vali wazi' },
  normal: { en: 'Normal', es: 'Normal', fr: 'Normal', sw: 'Kawaida' },
  fire: { en: 'FIRE', es: 'FUEGO', fr: 'FEU', sw: 'MOTO' },
  bypass: { en: 'Bypass', es: 'Bypass', fr: 'Bypass', sw: 'Bypass' },
  done: { en: 'Done', es: 'Hecho', fr: 'Fait', sw: 'Imekamilika' },
  skip: { en: 'Skip (not needed)', es: 'Omitir (no se necesita)', fr: 'Passer (inutile)', sw: 'Ruka (haihitajiki)' },
  exit: { en: 'Exit', es: 'Salir', fr: 'Quitter', sw: 'Toka' },
  start: { en: 'Start', es: 'Iniciar', fr: 'Commencer', sw: 'Anza' },
  step: { en: 'Step', es: 'Paso', fr: 'Étape', sw: 'Hatua' },
  employee: { en: 'Employee', es: 'Empleado', fr: 'Employé', sw: 'Mfanyakazi' },
  finished: { en: 'Procedure complete.', es: 'Procedimiento completo.', fr: 'Procédure terminée.', sw: 'Utaratibu umekamilika.' },
  mistakes: { en: 'Mistakes', es: 'Errores', fr: 'Erreurs', sw: 'Makosa' },
  not_step: { en: 'Not this step. Now:', es: 'No es este paso. Ahora:', fr: "Ce n'est pas cette étape. Maintenant :", sw: 'Si hatua hii. Sasa:' },
  check_failed: { en: 'Not yet. Check the state first.', es: 'Todavía no. Revise primero el estado.', fr: "Pas encore. Vérifiez d'abord l'état.", sw: 'Bado. Angalia hali kwanza.' },
  good: { en: 'Correct.', es: 'Correcto.', fr: 'Correct.', sw: 'Sahihi.' },
  lock_tag: { en: 'Lock + tag', es: 'Candado + etiqueta', fr: 'Cadenas + étiquette', sw: 'Kufuli + lebo' },
  remove_lock: { en: 'Remove my lock', es: 'Quitar mi candado', fr: 'Retirer mon cadenas', sw: 'Ondoa kufuli yangu' },
  name: { en: 'Name', es: 'Nombre', fr: 'Nom', sw: 'Jina' },
  date: { en: 'Date', es: 'Fecha', fr: 'Date', sw: 'Tarehe' },
  reason: { en: 'Reason', es: 'Motivo', fr: 'Motif', sw: 'Sababu' },
  apply: { en: 'Apply lock and tag', es: 'Poner candado y etiqueta', fr: 'Poser cadenas et étiquette', sw: 'Weka kufuli na lebo' },
  cancel: { en: 'Cancel', es: 'Cancelar', fr: 'Annuler', sw: 'Ghairi' },
  danger: { en: 'DANGER: DO NOT OPERATE', es: 'PELIGRO: NO OPERAR', fr: 'DANGER : NE PAS MANŒUVRER', sw: 'HATARI: USIWASHE' },
  flashlight: { en: "Flashlight test at the detector hatch", es: "Prueba con linterna en la escotilla", fr: "Test à la lampe à la trappe", sw: "Jaribio la tochi kwenye kifuniko" },
  flash_tool: { en: 'Flashlight', es: 'Linterna', fr: 'Lampe', sw: 'Tochi' },
  open_cut: { en: "Open it up", es: "Ver por dentro", fr: "Voir l'intérieur", sw: "Ona ndani" },
  close_cut: { en: "Close it", es: "Cerrar", fr: "Refermer", sw: "Funga" },
  open_panel: { en: 'Open the panel', es: 'Abrir el panel', fr: 'Ouvrir le panneau', sw: 'Fungua paneli' },
  go_there: { en: 'Go there', es: 'Ir allí', fr: 'Y aller', sw: 'Nenda huko' },
  water: { en: 'Water', es: 'Agua', fr: 'Eau', sw: 'Maji' },
  spraying: { en: 'Spraying', es: 'Rociando', fr: 'Pulvérise', sw: 'Inanyunyiza' },
  typical: { en: 'typical', es: 'típico', fr: 'typique', sw: 'kawaida' },
  valve: { en: 'Ball valve', es: 'Válvula de bola', fr: 'Vanne à bille', sw: 'Vali ya mpira' },
  open: { en: 'Open', es: 'Abierta', fr: 'Ouverte', sw: 'Wazi' },
  closed: { en: 'Closed', es: 'Cerrada', fr: 'Fermée', sw: 'Imefungwa' },
  hatch: { en: 'Detector hatch', es: 'Escotilla del detector', fr: 'Trappe du détecteur', sw: 'Kifuniko cha kigunduzi' },
  real_speed: { en: 'Real speed', es: 'Velocidad real', fr: 'Vitesse réelle', sw: 'Kasi halisi' },
  shown_at: { en: 'drawn at', es: 'dibujado a', fr: 'dessiné à', sw: 'imechorwa kwa' },
  walk_help: { en: "Drag to look. WASD or arrows to walk.", es: "Arrastre para mirar. WASD o flechas para caminar.", fr: "Glissez pour regarder. WASD ou flèches pour marcher.", sw: "Buruta kuangalia. WASD au mishale kutembea." },
  walk_help_touch: { en: "Drag to look. Joystick to walk.", es: "Arrastre para mirar. Joystick para caminar.", fr: "Glissez pour regarder. Joystick pour marcher.", sw: "Buruta kuangalia. Kijiti kutembea." },
  loading: { en: 'Loading the shop', es: 'Cargando el taller', fr: "Chargement de l'atelier", sw: 'Inapakia karakana' },
  energy: { en: 'Energy sources and isolation points', es: 'Fuentes de energía y puntos de aislamiento', fr: "Sources d'énergie et points d'isolement", sw: 'Vyanzo vya nishati na sehemu za kutenga' },
  demo_reset: { en: "Demo over. In real life a person resets the panels.", es: "Fin de la demostración. En la realidad, una persona restablece los paneles.", fr: "Démo terminée. En vrai, une personne réarme les panneaux.", sw: "Onyesho limekwisha. Kwa kweli, mtu hurudisha paneli." },
  no_shutdown: { en: "Machine shutdowns are not shown (not confirmed here).", es: "No se muestran paros de máquinas (no confirmados aquí).", fr: "Les arrêts de machines ne sont pas montrés (non confirmés ici).", sw: "Kuzimwa kwa mashine hakuonyeshwi (hakujathibitishwa hapa)." },
  approx: { en: 'Position approximate.', es: 'Posición aproximada.', fr: 'Position approximative.', sw: 'Mahali ni takriban.' },
  sim_note: { en: "Practice only. The real controls are on the wall.", es: "Solo práctica. Los mandos reales están en la pared.", fr: "Exercice seulement. Les vraies commandes sont au mur.", sw: "Mazoezi tu. Vidhibiti halisi viko ukutani." },
  shine: { en: 'Shine the flashlight in', es: 'Alumbrar con la linterna', fr: 'Éclairer avec la lampe', sw: 'Mulika tochi ndani' },
  open_hatch: { en: 'Open / close hatch', es: 'Abrir / cerrar escotilla', fr: 'Ouvrir / fermer la trappe', sw: 'Fungua / funga kifuniko' },
  close_valve: { en: 'Close / open ball valve', es: 'Cerrar / abrir válvula de bola', fr: 'Fermer / ouvrir la vanne', sw: 'Funga / fungua vali' },
  air: { en: 'Shop air', es: 'Aire del taller', fr: "Air de l'atelier", sw: 'Hewa ya karakana' },
  restart: { en: 'Restart', es: 'Reiniciar', fr: 'Recommencer', sw: 'Anza upya' },
  part_of: { en: 'Feeds', es: 'Alimenta', fr: 'Alimente', sw: 'Inalisha' },
  drag_hint: { en: "Tap a part to learn more. Drag to turn.", es: "Toque una pieza para saber más. Arrastre para girar.", fr: "Touchez une pièce pour en savoir plus. Glissez pour tourner.", sw: "Gusa sehemu kujua zaidi. Buruta kuzungusha." },
  flowmap: { en: "How the air flows", es: "Cómo fluye el aire", fr: "Comment l'air circule", sw: "Jinsi hewa inavyotiririka" },
  zones: { en: "Show air zones", es: "Mostrar zonas de aire", fr: "Montrer les zones d'air", sw: "Onyesha maeneo ya hewa" },
  tap_map: { en: "Tap a box to go there.", es: "Toque un cuadro para ir allí.", fr: "Touchez une case pour y aller.", sw: "Gusa kisanduku kwenda huko." },
  meet: { en: "Where they meet: main fan and airlock", es: "Donde se unen: ventilador y válvula rotativa", fr: "Points de rencontre : ventilateur et écluse", sw: "Zinapokutana: feni kuu na vali" },
  more_views: { en: "More views", es: "Más vistas", fr: "Plus de vues", sw: "Mionekano zaidi" },
  of: { en: "of", es: "de", fr: "sur", sw: "kati ya" },
  practice_loto: { en: "Practice the lockout", es: "Practicar el bloqueo", fr: "S’exercer à la consignation", sw: "Jizoeze kufunga" },
  replay: { en: "Replay", es: "Repetir", fr: "Revoir", sw: "Rudia" }
};

// ---------------------------------------------------------------- parts (info cards)
// Text is about the dust flow and Flamex. Facts come from scene.json notes, MANUAL_FACTS.md and FLAMEX_FACTS.md.
const PARTS = [
  { id: 'cyclone', re: /^Cyc__/, flow: 'sawdust_chips', cut: 'cyclone', view: 'cyclone',
    name: { en: 'Cyclone', es: 'Ciclón', fr: 'Cyclone', sw: 'Kitenganishi kimbunga' },
    desc: { en: "Dusty air spins along the wall. Heavy chips fall down the cone. Air with fine dust rises to the fan.", es: "El aire con polvo gira junto a la pared. Las virutas pesadas bajan por el cono. El aire con polvo fino sube al ventilador.", fr: "L'air chargé tourne le long de la paroi. Les copeaux lourds descendent le cône. L'air et la poussière fine montent au ventilateur.", sw: "Hewa yenye vumbi inazunguka kando ya ukuta. Vipande vizito vinashuka kwenye koni. Hewa yenye vumbi laini inapanda hadi feni." },
    facts: [{ en: "Suction side (vacuum)", es: "Lado de succión (vacío)", fr: "Côté aspiration (dépression)", sw: "Upande wa kuvuta (ombwe)" }] },
  { id: 'fan', re: /^(Fan__|Rig_FanImpeller|Rig_MotorFan)/, flow: 'air_fine_dust', cut: 'fan', view: 'fan', motor: 'fan',
    name: { en: 'Main fan', es: 'Ventilador principal', fr: 'Ventilateur principal', sw: 'Feni kuu' },
    desc: { en: "Pulls air out of the cyclone and pushes it down to the filters. Suction on one side, push on the other.", es: "Jala el aire del ciclón y lo empuja hacia los filtros. Succión de un lado, empuje del otro.", fr: "Aspire l'air du cyclone et le pousse vers les filtres. Aspiration d'un côté, soufflage de l'autre.", sw: "Huvuta hewa kutoka kimbunga na kuisukuma hadi vichujio. Kuvuta upande mmoja, kusukuma upande mwingine." },
    facts: [{ en: "Oneida, direct drive (starter says 20HP)", es: "Oneida, transmisión directa (el arrancador dice 20HP)", fr: "Oneida, entraînement direct (démarreur : 20HP)", sw: "Oneida, kiendeshi cha moja kwa moja (kianzishi: 20HP)" }, { en: "About 6,000-6,600 CFM", es: "Unos 6,000-6,600 CFM", fr: "Environ 6 000-6 600 CFM", sw: "Takriban CFM 6,000-6,600" }] },
  { id: 'airlock', re: /^(AL__body|AL__gear|AL__taper|Rig_AirlockRotor)/, flow: 'sawdust_chips', cut: 'airlock', view: 'airlock', motor: 'airlock',
    name: { en: 'Rotary airlock', es: 'Válvula rotativa', fr: 'Écluse rotative', sw: 'Vali ya kuzunguka' },
    desc: { en: "Turns slowly. Drops the chips into the chip loop but keeps the air in the cyclone.", es: "Gira despacio. Deja caer las virutas al circuito, pero el aire se queda en el ciclón.", fr: "Tourne lentement. Lâche les copeaux dans la boucle, mais garde l'air dans le cyclone.", sw: "Huzunguka polepole. Hudondosha vipande kwenye mzunguko, lakini huzuia hewa ndani ya kimbunga." },
    facts: [{ en: "Oneida 10 in, 13 rpm", es: "Oneida 10 in, 13 rpm", fr: "Oneida 10 in, 13 tr/min", sw: "Oneida in 10, rpm 13" }] },
  { id: 'tee', re: /^AL__tee/, flow: 'return_air', view: 'airlock',
    name: { en: 'Airlock tee', es: 'Te de la válvula rotativa', fr: "Té de l'écluse", sw: 'T ya vali' },
    desc: { en: "Chips drop in here. Air coming back from the roll-off carries them to the blower.", es: "Aquí caen las virutas. El aire que vuelve del contenedor las lleva al soplador.", fr: "Les copeaux tombent ici. L'air qui revient de la benne les porte à la soufflante.", sw: "Vipande vinaanguka hapa. Hewa inayorudi kutoka kontena huvipeleka kwa kipuliza." } },
  { id: 'blower', re: /^(BL__|Rig_Blower)/, flow: 'sawdust_chips', cut: 'transfer_blower', view: 'blower', motor: 'blower',
    name: { en: 'Transfer blower', es: 'Soplador de transferencia', fr: 'Ventilateur de transfert', sw: 'Kipuliza cha kusafirisha' },
    desc: { en: "Blows the chips up the riser and out to the roll-off. The same air comes back: a closed loop.", es: "Sopla las virutas por el tubo hasta el contenedor. El mismo aire regresa: circuito cerrado.", fr: "Souffle les copeaux dans la colonne jusqu’à la benne. Le même air revient : boucle fermée.", sw: "Hupuliza vipande juu ya bomba hadi kontena. Hewa ileile inarudi: mzunguko uliofungwa." } },
  { id: 'filters', re: /^FL__(cart|top|plenum|hopper|sleeve|stand)/, flow: 'clean_air', cut: 'filter_cartridge', view: 'filters',
    name: { en: 'Cartridge filters (4)', es: 'Filtros de cartucho (4)', fr: 'Filtres à cartouche (4)', sw: 'Vichujio vya katriji (4)' },
    desc: { en: "The fan pushes air in. It squeezes out through the pleats, clean. Fine dust stays inside and falls.", es: "El ventilador empuja el aire adentro. Sale limpio por los pliegues. El polvo fino queda dentro y cae.", fr: "Le ventilateur pousse l'air dedans. Il ressort propre par les plis. La poussière fine reste et tombe.", sw: "Feni husukuma hewa ndani. Hutoka safi kupitia mikunjo. Vumbi laini hubaki ndani na kuanguka." },
    facts: [{ en: "Push side (under pressure)", es: "Lado de empuje (a presión)", fr: "Côté soufflage (sous pression)", sw: "Upande wa kusukuma (kwa shinikizo)" }] },
  { id: 'drum', re: /^FL__(drum|pile)/, flow: 'fine_dust', cut: 'drum', view: 'filters',
    name: { en: 'Fine dust drum, 55 gal', es: 'Tambor de polvo fino, 55 gal', fr: 'Fût de poussière fine, 55 gal', sw: 'Pipa la vumbi laini, galoni 55' },
    desc: { en: "Fine dust falls down the clear sleeve into this drum.", es: "El polvo fino baja por la manga transparente a este tambor.", fr: "La poussière fine descend la manche transparente dans ce fût.", sw: "Vumbi laini hushuka kupitia mfuko angavu hadi pipa hili." } },
  { id: 'fanduct', re: /^DC_FanDuct/, flow: 'air_fine_dust', view: 'fan',
    name: { en: 'Fan duct', es: 'Ducto del ventilador', fr: 'Gaine du ventilateur', sw: 'Bomba la feni' },
    desc: { en: "Takes the air from the fan straight down to the filters.", es: "Lleva el aire del ventilador directo hacia abajo a los filtros.", fr: "Amène l'air du ventilateur droit vers le bas aux filtres.", sw: "Hupeleka hewa kutoka feni moja kwa moja chini hadi vichujio." } },
  { id: 'inlet', re: /^(DC_InletDuct|Fix_InletSpool)/, flow: 'dusty_air', cut: 'ducts', view: 'wall',
    name: { en: '12 in inlet', es: 'Entrada de 12 in', fr: 'Entrée 12 in', sw: 'Mlango wa in 12' },
    desc: { en: "Carries the dusty air through the wall into the cyclone.", es: "Lleva el aire con polvo por la pared hasta el ciclón.", fr: "Amène l'air chargé à travers le mur jusqu'au cyclone.", sw: "Hubeba hewa yenye vumbi kupitia ukuta hadi kimbunga." } },
  { id: 'trunk', re: /^Duct_Trunk_/, flow: 'dusty_air', cut: 'ducts', view: 'machines',
    name: { en: 'Main duct (12 in)', es: 'Ducto principal (12 in)', fr: 'Gaine principale (12 in)', sw: 'Bomba kuu (in 12)' },
    desc: { en: "Carries the dusty air from all the machines.", es: "Lleva el aire con polvo de todas las máquinas.", fr: "Amène l'air chargé de toutes les machines.", sw: "Hubeba hewa yenye vumbi kutoka mashine zote." } },
  { id: 'branch', re: /^(Duct_Branch_|Duct_Hose_|Duct_BinHose)/, flow: 'dusty_air', cut: 'ducts', view: 'machines',
    name: { en: 'Branch duct', es: 'Ducto de ramal', fr: 'Gaine de dérivation', sw: 'Bomba la tawi' },
    desc: { en: "Joins one machine to the main duct.", es: "Une una máquina al ducto principal.", fr: "Relie une machine à la gaine principale.", sw: "Huunganisha mashine moja na bomba kuu." } },
  { id: 'gate', re: /^Gate_/, flow: 'dusty_air', panel: 'gate_panel', view: 'machines',
    name: { en: 'Blast gate', es: 'Compuerta', fr: 'Vanne guillotine', sw: 'Vali ya vumbi' },
    desc: { en: "Opens only while its machine runs, so suction goes where it is needed. The blast gate panel opens and closes it.", es: "Abre solo mientras su máquina funciona, para que la succión vaya donde se necesita. El panel de compuertas la abre y la cierra.", fr: "S'ouvre seulement quand sa machine tourne, pour aspirer là où il faut. Le panneau des vannes l'ouvre et la ferme.", sw: "Hufunguka tu mashine yake ikifanya kazi, ili kuvuta kuende kunakohitajika. Paneli ya vali huifungua na kuifunga." } },
  { id: 'conveyor', re: /^(DC_ConveyPipe|DC_ConveyLow|DC_ConveyHoses)/, flow: 'return_air', view: 'back',
    name: { en: 'Conveying loop', es: 'Circuito de transporte', fr: 'Boucle de transport', sw: 'Mzunguko wa kusafirisha' },
    desc: { en: "Closed loop. Chips ride the upper gold hose to the roll-off. The air comes back in the lower hose.", es: "Circuito cerrado. Las virutas van por la manguera dorada de arriba al contenedor. El aire vuelve por la de abajo.", fr: "Boucle fermée. Les copeaux partent par le tuyau doré du haut vers la benne. L'air revient par celui du bas.", sw: "Mzunguko uliofungwa. Vipande huenda kwa bomba la dhahabu la juu hadi kontena. Hewa hurudi kwa la chini." } },
  { id: 'rolloff', re: /^(DC_Compactor|RO_Pile)/, flow: 'sawdust_chips', view: 'back',
    name: { en: 'Roll-off container', es: 'Contenedor', fr: 'Benne', sw: 'Kontena' },
    desc: { en: 'The chips end up here.', es: 'Aquí terminan las virutas.', fr: 'Les copeaux finissent ici.', sw: 'Vipande huishia hapa.' } },
  { id: 'detA', re: /^(Flamex_DetA_|Flamex_SparkDetectors)/, flow: '#78e6ff', panel: 'flamex_A', view: 'flamex',
    name: { en: 'Flamex spark detectors, zone A', es: 'Detectores de chispas Flamex, zona A', fr: "Détecteurs d'étincelles Flamex, zone A", sw: 'Vigunduzi vya cheche vya Flamex, eneo A' },
    desc: { en: "Two infrared eyes inside the duct. They see a spark at once.", es: "Dos ojos infrarrojos dentro del ducto. Ven una chispa al instante.", fr: "Deux yeux infrarouges dans la gaine. Ils voient une étincelle aussitôt.", sw: "Macho mawili ya infraredi ndani ya bomba. Huona cheche papo hapo." },
    facts: [{ en: "Flamex FUX 3001-E, two per duct", es: "Flamex FUX 3001-E, dos por ducto", fr: "Flamex FUX 3001-E, deux par gaine", sw: "Flamex FUX 3001-E, viwili kwa bomba" }] },
  { id: 'detB', re: /^Flamex_DetB_/, flow: '#78e6ff', panel: 'flamex_B', view: 'blower',
    name: { en: 'Flamex spark detectors, zone B', es: 'Detectores de chispas Flamex, zona B', fr: "Détecteurs d'étincelles Flamex, zone B", sw: 'Vigunduzi vya cheche vya Flamex, eneo B' },
    desc: { en: "Two infrared eyes on the chip riser, above the blower.", es: "Dos ojos infrarrojos en el tubo de virutas, sobre el soplador.", fr: "Deux yeux infrarouges sur la colonne à copeaux, au-dessus de la soufflante.", sw: "Macho mawili ya infraredi kwenye bomba la vipande, juu ya kipuliza." },
    facts: [{ en: "Flamex FUX 3001-E, two per duct", es: "Flamex FUX 3001-E, dos por ducto", fr: "Flamex FUX 3001-E, deux par gaine", sw: "Flamex FUX 3001-E, viwili kwa bomba" }] },
  { id: 'nozA', re: /^(Flamex_NozzleA|Flamex_ExtinguisherLine)/, flow: '#95e7ff', panel: 'flamex_A', view: 'wall',
    name: { en: 'Flamex water nozzle, zone A', es: 'Boquilla de agua Flamex, zona A', fr: "Buse d'eau Flamex, zone A", sw: 'Pua ya maji ya Flamex, eneo A' },
    desc: { en: "When a spark is seen, a fast valve opens. Water sprays across the duct.", es: "Al ver una chispa, una válvula rápida abre. El agua rocía a través del ducto.", fr: "Dès qu'une étincelle est vue, une vanne rapide s'ouvre. L'eau arrose la gaine.", sw: "Cheche ikionekana, vali ya haraka hufunguka. Maji hunyunyiziwa bombani." },
    facts: [{ en: "About 7 s of spray, 2-3 gal (typical)", es: "Unos 7 s de rociado, 2-3 gal (típico)", fr: "Environ 7 s, 2-3 gal (typique)", sw: "Takriban s 7, galoni 2-3 (kawaida)" }, { en: "Red ball valve, kept locked open", es: "Válvula de bola roja, bloqueada abierta", fr: "Vanne à bille rouge, cadenassée ouverte", sw: "Vali ya mpira nyekundu, imefungwa wazi" }] },
  { id: 'valveB', re: /^DC_FlamexValve/, flow: '#95e7ff', panel: 'flamex_B', view: 'back',
    name: { en: 'Flamex valve, zone B (insulated bag)', es: 'Válvula Flamex, zona B (funda aislante)', fr: 'Vanne Flamex, zone B (housse isolante)', sw: 'Vali ya Flamex, eneo B (mfuko wa kuhami)' },
    desc: { en: "Sprays water into the chip line when zone B trips.", es: "Rocía agua en la línea de virutas cuando se dispara la zona B.", fr: "Arrose la ligne à copeaux quand la zone B se déclenche.", sw: "Hunyunyiza maji kwenye bomba la vipande eneo B likiwaka." } },
  { id: 'horns', re: /^FX_Horn/, flow: '#ff7c6e', view: 'flamex',
    name: { en: 'Horn/strobes', es: 'Sirenas con luz', fr: 'Sirènes à flash', sw: 'Honi na taa' },
    desc: { en: "Sound and flash on a trip. \"ext\" silences them; the water keeps going.", es: "Suenan y destellan al dispararse. \"ext\" las silencia; el agua sigue.", fr: "Sonnent et clignotent. « ext » les coupe ; l’eau continue.", sw: "Hulia na kumulika. \"ext\" huzinyamazisha; maji yanaendelea." } },
  { id: 'machine', re: /^(CNC1_|CNC2_|EB_1_|EB_2_|PanelSaw_)/, flow: 'dusty_air', panel: 'gate_panel', view: 'machines',
    name: { en: 'Machine', es: 'Máquina', fr: 'Machine', sw: 'Mashine' },
    desc: { en: "When it runs and its gate is open, its dust goes to the collector.", es: "Cuando funciona y su compuerta está abierta, su polvo va al colector.", fr: "Quand elle tourne et que sa vanne est ouverte, sa poussière va au dépoussiéreur.", sw: "Ikifanya kazi na vali yake iko wazi, vumbi lake huenda kwa kikusanya." } },
  { id: 'shed', re: /^(Enc__|Frame__|DC_Enclosure_)/, flow: 'dusty_air', view: 'overview',
    name: { en: 'Dust collector shed', es: 'Caseta del colector', fr: 'Abri du dépoussiéreur', sw: 'Kibanda cha kikusanya vumbi' },
    desc: { en: "Outside the shop's north wall. Holds the cyclone, fan, filters, airlock and blower.", es: "Fuera de la pared norte del taller. Tiene el ciclón, ventilador, filtros, válvula rotativa y soplador.", fr: "Hors du mur nord de l'atelier. Abrite cyclone, ventilateur, filtres, écluse et soufflante.", sw: "Nje ya ukuta wa kaskazini. Ina kimbunga, feni, vichujio, vali na kipuliza." } }
];
const MACHINE_NAMES = { CNC1: 'CNC 1', CNC2: 'CNC 2', EB_1: 'EB1', EB_2: 'EB2', PanelSaw: 'PanelSaw' };

// ---------------------------------------------------------------- DOM
const elSide = $('#side'), elStage = $('#stage'), elRight = $('#right'), elHud = $('#hud'), elCap = $('#caption'),
  elFoot = $('#foot'), elLabels = $('#labels'), elToast = $('#toast'), elModal = $('#modal'), elJoy = $('#joy'), elWalkHelp = $('#walkhelp');
$('#loadtxt').textContent = U.loading.en + '…';
function toast(o, kind = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.innerHTML = t4(o);
  elToast.appendChild(d);
  while (elToast.children.length > 3) elToast.firstChild.remove();
  setTimeout(() => d.remove(), kind === 'bad' ? 6000 : 4200);
}
window.addEventListener('error', e => { console.error('app error', e.message); });

// ---------------------------------------------------------------- load
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
const loader = new GLTFLoader();
const GLBS = ['machines', 'shop_interior', 'collector', 'shop_room', 'shop_skins'];
const prog = Object.fromEntries(GLBS.map(k => [k, 0]));
const SIZES = { machines: 8814524, shop_interior: 3786016, collector: 3200392, shop_room: 60e6, shop_skins: 25e6 }; // updated by the real sizes as they arrive
function updLoad() {
  const t = Object.keys(prog).reduce((a, k) => a + prog[k], 0), T = Object.values(SIZES).reduce((a, b) => a + b, 0);
  $('#loadbar').style.width = Math.round(100 * t / T) + '%';
}
const GLB_EXT = '.glb';
function loadGLB(k, optional = false) {
  return new Promise((res, rej) => loader.load(k + GLB_EXT, g => { prog[k] = SIZES[k]; updLoad(); res(g); },
    e => { if (e.total) SIZES[k] = e.total; if (e.loaded) { prog[k] = e.loaded; updLoad(); } },
    err => { if (optional) { console.warn('[dce] optional ' + k + ' not loaded', err); prog[k] = SIZES[k]; res(null); } else rej(err); }));
}

let SC, CT, PR, TOUR;
const [scj, ctj, prj, tourj, gM, gS, gC, gR, gK] = await Promise.all([getJSON('scene.json'), getJSON('controls.json'), getJSON('procedures.json'), getJSON('tour.json'),
  loadGLB('machines'), loadGLB('shop_interior'), loadGLB('collector'), loadGLB('shop_room', true), loadGLB('shop_skins', true)]);
TOUR = tourj;
SC = scj; CT = ctj; PR = prj;

// ---------------------------------------------------------------- renderer / scene
// quality ladder (office PC with integrated graphics first): 3 = pixel ratio up to 1.5 + shadows, 2 = pixel ratio 1 + shadows,
// 1 = no shadows + 60% particles, 0 = 35% particles. Steps down by itself when frames take over 20 ms (see stepQuality).
const QUAL = { level: Q.has('q') ? clamp(+Q.get('q'), 0, 3) : 3, acc: 0, n: 0, hold: 3, slow: 0 };
const qualPR = () => Math.min(window.devicePixelRatio || 1, Q.has('shot') ? 1 : (QUAL.level >= 3 ? 1.5 : 1));
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') || Q.has('pdb') });
renderer.setPixelRatio(qualPR());
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the shop is static: the shadow map is redrawn only when something shows or hides
elStage.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(SC.render.background || '#eff1f5');
const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 500);
const hemi = new THREE.HemisphereLight(0xffffff, 0xa9aeb8, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.55);
const ld = SC.render.light_direction || [0.45, 0.82, 0.35];
const SITE_C = new THREE.Vector3(18, 1.5, -12); // middle of the shop + collector (glTF frame)
sun.position.set(SITE_C.x + ld[0] * 50, SITE_C.y + ld[1] * 50, SITE_C.z + ld[2] * 50);
sun.target.position.copy(SITE_C); scene.add(sun.target);
sun.castShadow = QUAL.level >= 2;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 110 });
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.45);
fill.position.set(-30, 20, -25);
scene.add(fill);
// soft environment light for the textured shop (the flat explainer parts stay Lambert)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
let SHADOW_DIRTY = true;

const world = new THREE.Group();
scene.add(world);
for (const g of [gS, gC, gM]) world.add(g.scene);
// the whole laminate shop (shop_room.glb) and the textured machines (shop_skins.glb)
const roomMeshes = new Set();
const ROOMCAT = {}; // node name -> category (WallN, WallS, WallE, WallW, Roof, Overhead, Floor, Ground, Warehouse, Cranes, Cages, Machines, Skin)
const SKIN_PRE = { CNC1: 'CNC1_', CNC2: 'CNC2_', EB1: 'EB_1_', EB2: 'EB_2_', PanelSaw: 'PanelSaw_' };
const SKINS = {};
const TEXCACHE = new Map(); // one GPU copy per image (the edgebander and shop-fit atlases are in both files)
const TEXSLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'];
function shareTextures(m) {
  for (const k of TEXSLOTS) {
    const t = m[k]; if (!t || !t.name) continue;
    const key = t.name + '|' + t.colorSpace + '|' + t.channel;
    if (TEXCACHE.has(key)) m[k] = TEXCACHE.get(key); else TEXCACHE.set(key, t);
  }
}
async function slimTextures() { // normal and ORM maps above 1024 px go to 1024 on the GPU (half the memory on integrated graphics)
  const jobs = [];
  for (const t of new Set(TEXCACHE.values())) {
    const im = t.image;
    if (!im || !/_(N|ORM)$/.test(t.name) || (im.width || 0) <= 1024 || typeof createImageBitmap !== 'function') continue;
    jobs.push(createImageBitmap(im, { resizeWidth: 1024, resizeHeight: Math.round(1024 * im.height / im.width), resizeQuality: 'high' })
      .then(b => { if (im.close) im.close(); t.image = b; t.needsUpdate = true; }).catch(() => {}));
  }
  await Promise.all(jobs);
}
function prepRoomMat(m) {
  if (m.userData.prepped) return; m.userData.prepped = true;
  shareTextures(m);
  if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.3); } // no transmission pass
  if (m.normalMap) m.normalScale.y *= -1; // the kits' normal maps are DirectX (green down)
  m.envMapIntensity = 0.6;
  for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) if (t) t.anisotropy = 4;
  if (m.transparent) m.depthWrite = false;
}
for (const g of [gR, gK]) {
  if (!g) continue;
  world.add(g.scene);
  g.scene.updateMatrixWorld(true);
  g.scene.traverse(o => {
    const cat = o.userData && o.userData.room_cat;
    if (cat && o.name) ROOMCAT[o.name] = cat;
    if (o.userData && o.userData.skin_of) SKINS[o.userData.skin_of] = o;
  });
  // identical parts written once (same geometry + material) -> one InstancedMesh each
  const same = new Map();
  g.scene.traverse(o => { if (o.isMesh) { const k = o.geometry.uuid + '|' + o.material.uuid; (same.get(k) || same.set(k, []).get(k)).push(o); } });
  let ni = 0;
  for (const list of same.values()) {
    if (list.length < 2) continue;
    const im = new THREE.InstancedMesh(list[0].geometry, list[0].material, list.length);
    let cat = 'Machines'; for (let p = list[0]; p; p = p.parent) if (p.userData && p.userData.room_cat) { cat = p.userData.room_cat; break; }
    list.forEach((o, i) => { im.setMatrixAt(i, o.matrixWorld); o.parent.remove(o); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.name = 'RoomInst_' + cat + '_' + (ni++); ROOMCAT[im.name] = cat;
    g.scene.add(im);
  }
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    roomMeshes.add(o);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) prepRoomMat(m);
    let cat = null; for (let p = o; p; p = p.parent) if (ROOMCAT[p.name]) { cat = ROOMCAT[p.name]; break; }
    o.castShadow = /^(Skin|Machines|Cranes|Cages)$/.test(cat || '');
    o.receiveShadow = !/^(Overhead|Roof)$/.test(cat || '');
  });
}
await slimTextures();
world.updateMatrixWorld(true);

// node map and material registry (flat Lambert colors = the video's Workbench look)
const NODE = {};
world.traverse(o => { if (o.name && !NODE[o.name]) NODE[o.name] = o; });
const MATS = {}; // name -> [materials]
const lamCache = new Map();
function toLambert(m) {
  if (lamCache.has(m)) return lamCache.get(m);
  const l = new THREE.MeshLambertMaterial({ color: m.color ? m.color.clone() : new THREE.Color(0xcccccc), name: m.name, side: THREE.DoubleSide,
    transparent: m.transparent || m.opacity < 1, opacity: m.opacity ?? 1, depthWrite: !(m.transparent || m.opacity < 1) });
  l.userData.base = { transparent: l.transparent, opacity: l.opacity, depthWrite: l.depthWrite };
  (MATS[l.name] = MATS[l.name] || []).push(l);
  lamCache.set(m, l);
  return l;
}
// flat machine copies that a textured skin replaces: drawn by nothing, but still there for picking, labels and outlines
const SKINNED = new Set(Object.keys(SKINS).map(k => SKIN_PRE[k]));
const NO_DRAW = new THREE.MeshBasicMaterial({ visible: false });
const isSkinned = name => [...SKINNED].some(p => name.startsWith(p));
const pickables = [];
for (const g of [gS, gC, gM]) g.scene.traverse(o => {
  if (o.isMesh) {
    o.material = Array.isArray(o.material) ? o.material.map(toLambert) : toLambert(o.material);
    pickables.push(o);
    if (g === gC) { o.castShadow = true; o.receiveShadow = true; }
  }
});
for (const n of Object.keys(NODE)) if (isSkinned(n) && NODE[n].parent && !ROOMCAT[n]) NODE[n].traverse(o => { if (o.isMesh) o.userData.noDraw = true; });
for (const o of pickables) if (o.userData.noDraw) o.material = NO_DRAW;
for (const n of ['Ctx_Ground', 'Pad__slab']) if (NODE[n]) NODE[n].traverse(o => { if (o.isMesh) o.receiveShadow = true; });
if (gR && NODE.Ctx_Ground) { // the explainer's ground stopped at x 30; the shop goes to 36.6 and the back lot beyond
  const G = NODE.Ctx_Ground; G.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(G);
  G.position.y -= 0.035; // under the shop's own back-lot ground (z 0.745), no z-fighting
  G.scale.x = (46 - bb.min.x) / (bb.max.x - bb.min.x); G.position.x += bb.min.x * (1 - G.scale.x);
  G.updateMatrixWorld(true);
}
function topNode(o) { // highest ancestor below a gltf scene root
  let p = o;
  while (p.parent && p.parent.parent && p.parent.parent !== world) p = p.parent;
  while (p.parent && p.parent !== world && p.parent.parent !== world) p = p.parent;
  return p;
}
const cloneMatFor = (nodeName) => { // per-node material clones (for tinting / clipping without touching shared ones)
  const n = NODE[nodeName]; if (!n) return [];
  const out = [];
  n.traverse(o => {
    if (!o.isMesh) return;
    const cl = (m) => { const c = m.clone(); c.userData.base = { ...m.userData.base }; (MATS[c.name] = MATS[c.name] || []).push(c); out.push(c); return c; };
    o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material);
  });
  return out;
};

// ---------------------------------------------------------------- visibility layers
const HIDE_TOUR = new Set(); // nodes the current tour stop hides
const TOG = { xray: true, shed_walls: true, shed_roof: true, shop_wall: true, shop_roof: false, labels: true, sound: false, follow: true };
const roomOf = (...cats) => Object.keys(ROOMCAT).filter(n => cats.includes(ROOMCAT[n]) && NODE[n]);
const ROOM_WALLN = roomOf('WallN');
const groupNodes = {
  shed_walls: [...SC.groups.shed_walls, ...SC.groups.shed_frame.filter(n => n !== 'Frame__top'), ...SC.groups.shed_doors],
  shed_roof: [...SC.groups.shed_roof],
  shop_wall: [...SC.groups.shop_wall_high, ...SC.groups.shop_wall_low, ...SC.groups.wall_window_panel, 'FX_HornConduit_lo', ...roomOf('WallN', 'WallS', 'WallE', 'WallW')],
  shop_roof: roomOf('Roof')
};
const CUTHIDE = new Set(); // cut pieces hidden by open cross sections
const EXTRA_HIDE = new Set(['Ctx_WallLo_Switchgear']); // placeholder block replaced by the real wall controls
// with the whole shop loaded, its own floor and north wall replace the explainer's cropped slab and plain wall pieces
const CTX_WALL = [...SC.groups.shop_wall_high, ...SC.groups.shop_wall_low].filter(n => !/Flex|Card/.test(n));
if (gR) for (const n of ['Ctx_ShopFloorSlab', ...CTX_WALL]) EXTRA_HIDE.add(n);
const groupOf = {};
for (const [g, ns] of Object.entries(groupNodes)) for (const n of ns) groupOf[n] = g;
function applyVisibility() {
  for (const [name, n] of Object.entries(NODE)) {
    if (!n.parent || n.parent.parent !== world && n.parent !== world) { /* nested nodes follow parents */ }
    let vis = true;
    const g = groupOf[name];
    if (g) vis = TOG[g];
    if (HIDE_TOUR.has(name) && !(g && TOG[g] && tourOverride.has(g))) vis = false;
    if (CUTHIDE.has(name)) vis = false;
    if (EXTRA_HIDE.has(name)) vis = false;
    if (n.userData.slideHidden) vis = false;
    if (OVERHEAD_OFF && ROOMCAT[name] === 'Overhead') vis = false;
    if (n.visible !== vis) SHADOW_DIRTY = true;
    n.visible = vis;
  }
}
const tourOverride = new Set();
// seen from above the roof line, the lights, pipes and roof steel hide so the shop floor reads clearly
let OVERHEAD_OFF = false;
function stepOverhead() { const off = camera.position.y > 7.2 && !TOG.shop_roof; if (off !== OVERHEAD_OFF) { OVERHEAD_OFF = off; applyVisibility(); } }
function setXray(on) {
  TOG.xray = on;
  const names = new Set([...SC.translucent.shop_materials, ...SC.translucent.shed_materials]);
  for (const nm of names) for (const m of (MATS[nm] || [])) {
    if (on) { m.transparent = true; m.opacity = Math.min(m.userData.base.opacity, SC.translucent.alpha); m.depthWrite = false; }
    else { m.transparent = m.userData.base.transparent; m.opacity = m.userData.base.opacity; m.depthWrite = m.userData.base.depthWrite; }
    m.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- rotating parts, gates, cut pieces
const ROT = SC.rotating.map(r => ({ ...r, node: NODE[r.node], base: NODE[r.node] ? NODE[r.node].quaternion.clone() : null, axis: V3(r.axis_local).normalize(), angle: 0 }));
const motorOfRot = {};
for (const [m, d] of Object.entries(CT.motors)) for (const n of d.rotating) motorOfRot[n] = m;

const GATES = {};
for (const [id, g] of Object.entries(SC.gates)) {
  const slide = NODE[g.slide_node];
  if (!slide) continue;
  const mats = cloneMatFor(g.slide_node);
  GATES[id] = { ...g, slide, mats, f: 0, home: V3(g.home), axis: V3(g.axis).normalize() };
}
function placeGate(G) {
  const p = G.home.clone().addScaledVector(G.axis, G.travel_m * G.f);
  const par = G.slide.parent; par.updateMatrixWorld(true);
  G.slide.position.copy(par.worldToLocal(p));
  const col = new THREE.Color(G.f > 0.5 ? G.colors.open : G.colors.closed);
  for (const m of G.mats) { m.color.copy(col); m.emissive.setHex(G.f > 0.5 ? 0x0c3a18 : 0x3a0c0c); }
}

// cutaway pieces: remember home position and slide-out direction
const CUT = {};
for (const [k, c] of Object.entries(SC.cutaways)) {
  const pieces = c.hide.map(n => NODE[n]).filter(Boolean).map(n => {
    const box = new THREE.Box3().setFromObject(n), ctr = box.getCenter(new THREE.Vector3());
    let ap = c.wedge ? V3(c.wedge.axis_point) : null;
    if (!ap) { const kb = new THREE.Box3(); for (const nm of (c.interior || [])) if (NODE[nm]) kb.expandByObject(NODE[nm]); ap = kb.isEmpty() ? ctr.clone().add(new THREE.Vector3(0.2, 0, 0)) : kb.getCenter(new THREE.Vector3()); }
    const dir = ctr.clone().sub(ap); dir.y = 0; if (dir.lengthSq() < 1e-6) dir.set(-1, 0, 0); dir.normalize();
    // the piece opens with a clip-plane sweep: its range along dir, from the outside in
    let pmin = Infinity, pmax = -Infinity;
    for (let q = 0; q < 8; q++) {
      const d = new THREE.Vector3(q & 1 ? box.max.x : box.min.x, q & 2 ? box.max.y : box.min.y, q & 4 ? box.max.z : box.min.z).dot(dir);
      pmin = Math.min(pmin, d); pmax = Math.max(pmax, d);
    }
    return { node: n, home: n.position.clone(), dir, pmin, pmax, plane: new THREE.Plane(dir.clone().negate(), pmax + 0.01), mats: cloneMatFor(n.name), clipOn: false };
  });
  CUT[k] = { ...c, key: k, pieces, open: false, t: 0 };
}
// ducts cross section: clip the ceiling ducts above their centerline (swept down when it opens)
const ductClip = new THREE.Plane(V3(SC.translucent.ceiling_section.normal), SC.translucent.ceiling_section.constant);
const ductC0 = ductClip.constant;
const ductClipMats = [];
for (const n of SC.translucent.ceiling_section.applies_to) for (const m of cloneMatFor(n)) ductClipMats.push(m);
CUT.ducts = { key: 'ducts', text: U.ducts, pieces: [], open: false, t: 0, clip: true, clipOn: false };
// transfer blower face plate clip
const blClipDef = SC.cutaways.transfer_blower.clip_plane;
const blClip = blClipDef ? new THREE.Plane(V3(blClipDef.normal), blClipDef.constant) : null;
const blC0 = blClip ? blClip.constant : 0;
const blClipMats = blClipDef ? blClipDef.applies_to.flatMap(n => cloneMatFor(n)) : [];
const CUTSWEEP = new Set(); // cut pieces in mid-sweep (overlays skip them)
function setCutOpen(k, open, quiet = false) {
  const c = CUT[k]; if (!c) return;
  c.open = open;
  if (!quiet) renderSide();
}
function stepCuts(dt) {
  const rate = dt / 0.9;
  for (const c of Object.values(CUT)) {
    const tgt = c.open ? 1 : 0;
    if (c.t !== tgt) c.t = RM ? tgt : (c.t < tgt ? Math.min(1, c.t + rate) : Math.max(0, c.t - rate));
    const e = ease(c.t);
    for (const p of c.pieces) {
      const clip = c.t > 0.001 && c.t < 0.999;
      if (clip !== p.clipOn) { p.clipOn = clip; for (const m of p.mats) { m.clippingPlanes = clip ? [p.plane] : null; m.needsUpdate = true; } }
      p.plane.constant = p.pmax + 0.01 - e * (p.pmax - p.pmin + 0.02);
      if (clip) CUTSWEEP.add(p.node.name); else CUTSWEEP.delete(p.node.name);
      const hide = c.t >= 0.999;
      if (hide !== CUTHIDE.has(p.node.name)) { if (hide) CUTHIDE.add(p.node.name); else CUTHIDE.delete(p.node.name); applyVisibility(); }
    }
  }
  // the ceiling ducts and the blower face plate: the plane sweeps in from outside the part
  const sweep = (c, mats, plane, c0, reach) => {
    const on = c.t > 0.001;
    if (on !== c.clipOn) { c.clipOn = on; for (const m of mats) { m.clippingPlanes = on ? [plane] : null; m.needsUpdate = true; } }
    plane.constant = c0 + (1 - ease(c.t)) * reach;
  };
  sweep(CUT.ducts, ductClipMats, ductClip, ductC0, 1.6);
  if (blClip && CUT.transfer_blower) sweep(CUT.transfer_blower, blClipMats, blClip, blC0, 0.6);
}
// exploded view
const EXPL = { e: 0, target: 0, groups: Object.values(SC.explode.groups).map(g => ({ off: g.offset_up_m, nodes: g.nodes.map(n => NODE[n]).filter(Boolean).map(n => ({ n, y: n.position.y })) })) };

// Flamex nodes (cloned materials for flashing)
const FXN = {
  det: { A: SC.groups.flamex_detectors.A.flatMap(n => cloneMatFor(n)), B: SC.groups.flamex_detectors.B.flatMap(n => cloneMatFor(n)) },
  lens: SC.groups.flamex_strobe_lenses.flatMap(n => cloneMatFor(n)),
  panel: { A: cloneMatFor('FX_Panel_A'), B: cloneMatFor('FX_Panel_B') }
};
const lensPos = SC.groups.flamex_strobe_lenses.map(n => { const b = new THREE.Box3().setFromObject(NODE[n]); return b.getCenter(new THREE.Vector3()); });

// ---------------------------------------------------------------- simulator state
const SIM = { t: 0 };
const SM = createSim(CT, SC, { say: (o, k) => say(o, k), renderAll: () => renderAll(), playClunk: () => playClunk(), playHiss: () => playHiss(),
  buildLockVisual: id => buildLockVisual(id), sparkInZone: z => sparkInZone(z), now: () => SIM.t });
const { S, CTL, MSG, listeners, emit, result, motorPowered, motorLocked, updateMotors, pressStarter, pressAirlockBox, setEaton, lockable,
  isOffForLock, applyLock, removeLock, setGate, setAir, setValve, toggleHatch, shine, trip, fxButton, hatchLightOpen, freshState, fxZone,
  LV, gateLv, systemOn, systemOff } = SM;
Object.assign(S, freshState());
function sparkInZone(zone) { return DEMO && DEMO.sparks.some(s => s.zone === zone && s.alive && s.detected); }

let lastSay = null;
function say(o, kind = '') { lastSay = { o, kind, t: performance.now() }; toast(o, kind); }

// ---------------------------------------------------------------- sound (optional, off by default)
let AC = null;
function ac() { if (!TOG.sound) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } return AC; }
function playHiss() {
  const a = ac(); if (!a) return;
  const len = a.sampleRate * 0.5, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2) * 0.35;
  const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
  s.connect(f).connect(a.destination); s.start();
}
function playClunk() {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 90; g.gain.setValueAtTime(0.4, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.16);
}
let beepT = 0;
function soundTick(dt) {
  const a = ac(); if (!a) return;
  beepT -= dt;
  const buzz = ['A', 'B'].some(z => S.flamex[z].buzzer || S.flamex[z].lamp > 0), horn = ['A', 'B'].some(z => S.flamex[z].horns);
  if ((buzz || horn) && beepT <= 0) {
    beepT = horn ? 0.5 : 0.7;
    const o = a.createOscillator(), g = a.createGain(); o.type = horn ? 'sawtooth' : 'square'; o.frequency.value = horn ? 700 : 2700;
    g.gain.setValueAtTime(0.06, a.currentTime); g.gain.setValueAtTime(0, a.currentTime + (horn ? 0.35 : 0.12));
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.4);
  }
}

// ---------------------------------------------------------------- 3D wall controls (built from controls.json)
const CTL3 = {}; // id -> {group, parts}
const clickables = [];
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { cv, g, draw };
  return t;
}
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function boxMesh(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
function tagClick(mesh, ctl, act, extra = {}) { mesh.userData.ctl = ctl; mesh.userData.act = act; Object.assign(mesh.userData, extra); clickables.push(mesh); }
function faceGroup(c) { // group at pos, rotated so local +z is the face normal
  const g = new THREE.Group(); g.position.copy(V3(c.pos));
  const f = V3(c.face || [0, 0, 1]); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normalize());
  world.add(g); return g;
}
const EATON_TEX = canvasTex(128, 96, (g, w, h) => {
  g.fillStyle = '#a9aeb3'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.fillRect(14, 10, 100, 70); g.fillStyle = '#1d3d8f'; g.font = 'bold 20px Arial'; g.fillText('EATON', 30, 32);
  g.fillStyle = '#c00'; g.font = 'bold 14px Arial'; g.fillText('ON', 76, 52); g.fillText('OFF', 72, 72); g.fillStyle = '#333'; g.font = '10px Arial'; g.fillText('Safety Switch', 22, 48);
});
function buildEaton(c) {
  const g = faceGroup(c), [w, h, d] = c.size;
  const body = boxMesh(w, h, d, lam(0xa9aeb3)); g.add(body); tagClick(body, c.id, 'panel');
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.6), new THREE.MeshBasicMaterial({ map: EATON_TEX }));
  face.position.set(-w * 0.05, h * 0.12, d / 2 + 0.002); g.add(face); tagClick(face, c.id, 'panel');
  // handle on the right side: pivot near its lower end, up = ON
  const piv = new THREE.Group(); piv.position.set(w / 2 + 0.014, h * 0.05, d * 0.1); g.add(piv);
  const lever = boxMesh(0.016, h * 0.36, 0.03, lam(0x707478)); lever.position.y = h * 0.18; piv.add(lever);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.016, w * 0.09), 14, 10), lam(0xd42020)); knob.position.y = h * 0.36; piv.add(knob);
  for (const m of [lever, knob]) tagClick(m, c.id, 'handle');
  const lockG = new THREE.Group(); lockG.position.set(w / 2 + 0.03, -h * 0.1, d * 0.2); g.add(lockG);
  CTL3[c.id] = { g, piv, lockG, c };
}
function buildStarter(c) {
  const g = faceGroup(c), [w, h, d] = c.size;
  const body = boxMesh(w, h, d, lam(0xeeeee8)); g.add(body); tagClick(body, c.id, 'panel');
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.42), new THREE.MeshBasicMaterial({ map: canvasTex(96, 50, (x, W, H) => {
    x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.font = 'bold 30px Arial'; x.fillText(c.number, 8, 34);
    if (c.printed) { x.font = 'bold 13px Arial'; x.fillText(c.printed, 34, 30); }
  }) }));
  lab.position.set(0, h * 0.3, d / 2 + 0.002); g.add(lab);
  const mk = (col, emi) => new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.014, 20), lam(col, { emissive: emi }));
  const gb = mk(0x2ea043, 0x000000), rb = mk(0xd22222, 0x000000);
  for (const b of [gb, rb]) { b.rotation.x = Math.PI / 2; g.add(b); }
  if (c.buttons === 'stacked') { gb.position.set(0, 0.0, d / 2 + 0.007); rb.position.set(0, -h * 0.28, d / 2 + 0.007); }
  else { gb.position.set(-w * 0.2, -h * 0.2, d / 2 + 0.007); rb.position.set(w * 0.2, -h * 0.2, d / 2 + 0.007); }
  tagClick(gb, c.id, 'start'); tagClick(rb, c.id, 'stop');
  CTL3[c.id] = { g, gb, rb, c };
}
function lcdDraw(lines, blue = true) {
  return (x, W, H) => {
    x.fillStyle = blue ? '#1f4fd1' : '#9fb19a'; x.fillRect(0, 0, W, H);
    x.fillStyle = blue ? '#eaf1ff' : '#18200f'; x.font = 'bold 15px Courier New, monospace';
    lines.forEach((l, i) => x.fillText(l, 6, 20 + i * 18));
  };
}
function buildAirlockBox(c) {
  const g = faceGroup(c), [w, h, d] = c.size;
  const body = boxMesh(w, h, d, lam(0x9da3a9)); g.add(body); tagClick(body, c.id, 'panel');
  const mk = (col) => new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 20), lam(col));
  const gb = mk(0x2ea043), rb = mk(0xd22222);
  for (const b of [gb, rb]) { b.rotation.x = Math.PI / 2; g.add(b); }
  gb.position.set(-w * 0.33, h * 0.18, d / 2 + 0.007); rb.position.set(-w * 0.33, -h * 0.14, d / 2 + 0.007);
  tagClick(gb, c.id, 'on'); tagClick(rb, c.id, 'off');
  const tex = canvasTex(160, 48, lcdDraw(c.lcd_on.split('|')));
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, w * 0.165), new THREE.MeshBasicMaterial({ map: tex }));
  lcd.position.set(w * 0.15, h * 0.12, d / 2 + 0.002); g.add(lcd); tagClick(lcd, c.id, 'panel');
  CTL3[c.id] = { g, gb, rb, tex, c, lcdOn: null };
}
function buildGatePanel(c) {
  // red column + yellow box facing west
  const col = new THREE.Mesh(new THREE.CylinderGeometry(c.column_radius, c.column_radius, 4.0, 24), lam(0xb42a22));
  col.position.set(c.column[0], 1.464 + 2.0, c.column[1]); world.add(col); tagClick(col, c.id, 'panel');
  const g = faceGroup(c), [d, h, w] = c.size;
  const box = boxMesh(w, h, d, lam(0xd8b51a)); g.add(box); tagClick(box, c.id, 'panel');
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.32), new THREE.MeshBasicMaterial({ map: canvasTex(480, 128, (x, W, H) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.textAlign = 'center';
    const colW = W / 5 - 8; // each name fits its own column (no overlapping text)
    c.buttons.forEach((b, i) => {
      const [a, bb] = b.printed.split(/ (?=\S+$)/); const cx = W * (i + 0.5) / 5;
      let fs = 17; x.font = `bold ${fs}px Arial`; while (fs > 9 && Math.max(x.measureText(a).width, x.measureText(bb || '').width) > colW) { fs--; x.font = `bold ${fs}px Arial`; }
      x.fillText(a, cx, 24); x.fillText(bb || '', cx, 24 + fs + 3);
    });
  }) }));
  plate.position.set(0, -h * 0.22, d / 2 + 0.003); g.add(plate);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, h * 0.5), new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (x, W, H) => {
    x.fillStyle = '#5a6068'; x.fillRect(0, 0, W, H); x.fillStyle = '#dcdcdc'; x.fillRect(150, 30, 90, 70); x.strokeStyle = '#999'; x.strokeRect(150, 30, 90, 70);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(70, 50, 30, 0, 7); x.fill(); x.strokeStyle = '#222'; x.lineWidth = 3; x.stroke();
    x.strokeStyle = '#c00'; x.beginPath(); x.moveTo(70, 50); x.lineTo(88, 34); x.stroke();
    x.strokeStyle = '#e44'; x.lineWidth = 1; for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo(10 + i * 13, 110); x.lineTo(20 + i * 12, 150); x.stroke(); }
  }) }));
  inner.position.set(0, h * 0.18, d / 2 + 0.002); g.add(inner);
  const btns = {};
  c.buttons.forEach((b, i) => {
    const x = -w * 0.9 / 2 + w * 0.9 * (i + 0.5) / 5;
    const gb = boxMesh(0.034, 0.03, 0.016, lam(0x1e8f3a)), rb = boxMesh(0.034, 0.03, 0.016, lam(0xb81d1d));
    gb.position.set(x, -h * 0.25, d / 2 + 0.008); rb.position.set(x, -h * 0.33, d / 2 + 0.008);
    g.add(gb); g.add(rb); tagClick(gb, c.id, 'open', { gate: b.gate }); tagClick(rb, c.id, 'close', { gate: b.gate });
    btns[b.gate] = { gb, rb };
  });
  CTL3[c.id] = { g, btns, c };
}
function buildAirValve(c) {
  const g = faceGroup(c);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 12), lam(0x444a50)); g.add(pipe);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 10), lam(0xb0a060)); g.add(body); tagClick(body, c.id, 'toggle');
  const piv = new THREE.Group(); piv.position.set(0, 0, 0.03); g.add(piv);
  const lever = boxMesh(0.02, 0.11, 0.012, lam(0x1f5fd1)); lever.position.y = 0.05; piv.add(lever); tagClick(lever, c.id, 'toggle');
  const lockG = new THREE.Group(); lockG.position.set(0.04, -0.04, 0.03); g.add(lockG);
  CTL3[c.id] = { g, piv, lockG, c };
}
function buildBallValve(c) {
  const g = new THREE.Group(); g.position.copy(V3(c.pos)); world.add(g);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), lam(0xc9a24a)); g.add(body); tagClick(body, c.id, 'toggle');
  const piv = new THREE.Group(); piv.position.y = 0.035; g.add(piv);
  const lever = boxMesh(0.16, 0.014, 0.024, lam(0xd42020)); lever.position.x = 0.07; piv.add(lever); tagClick(lever, c.id, 'toggle');
  const lockG = new THREE.Group(); lockG.position.set(0.03, -0.05, 0.03); g.add(lockG);
  CTL3[c.id] = { g, piv, lockG, c };
}
function buildHatch(c) {
  const g = new THREE.Group(); g.position.copy(V3(c.pos));
  const n = V3(c.normal).normalize(); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); world.add(g);
  const piv = new THREE.Group(); piv.position.set(0, c.size[1] / 2, 0); g.add(piv);
  const plate = boxMesh(c.size[0], c.size[1], 0.012, lam(0x9aa3ab)); plate.position.y = -c.size[1] / 2; piv.add(plate);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), lam(0x333333)); knob.position.set(0, -c.size[1] * 0.85, 0.012); piv.add(knob);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(c.size[0] * 0.9, c.size[1] * 0.9), new THREE.MeshBasicMaterial({ color: 0x14161a })); hole.position.z = -0.004; g.add(hole);
  tagClick(plate, c.id, 'toggle'); tagClick(knob, c.id, 'toggle'); tagClick(hole, c.id, 'toggle');
  CTL3[c.id] = { g, piv, c };
}
function buildBucket(c) {
  const g = new THREE.Group(); g.position.copy(V3(c.pos)); world.add(g);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 20, 1, true), lam(0xe8771a, { side: THREE.DoubleSide })); b.position.y = 0.17; g.add(b);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), lam(0xb45a10)); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.005; g.add(bot);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), lam(0x7fd3ff)); water.rotation.x = -Math.PI / 2; water.position.y = 0.02; water.visible = false; g.add(water);
  tagClick(b, c.id, 'toggle'); tagClick(bot, c.id, 'toggle');
  CTL3[c.id] = { g, water, c, fill: 0 };
}
function buildHose(c) {
  const g = new THREE.Group(); g.position.copy(V3(c.pos)); world.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 10, 28), lam(0xcfa53a)); ring.rotation.y = Math.PI / 2 - 0.26; g.add(ring);
  tagClick(ring, c.id, 'toggle');
  CTL3[c.id] = { g, ring, c };
}
function buildOutsideDressing() { // three conduits along the outside face, junction box, drops to the switches
  const outs = CT.controls.filter(c => c.type === 'eaton' && c.where === 'outside');
  const zf = -19.05;
  const cm = lam(0x9a9a92);
  [1.35, 1.5, 1.65].forEach((y, i) => {
    const len = 8.4 - 5.6, m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 12), cm);
    m.rotation.z = Math.PI / 2; m.position.set(5.6 + len / 2, y, zf - 0.06 - i * 0.0); world.add(m);
  });
  for (const c of outs) {
    const p = V3(c.pos), m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, p.y - 1.65 - c.size[1] / 2, 8), cm);
    m.position.set(p.x, 1.65 + (p.y - 1.65 - c.size[1] / 2) / 2, zf - 0.05); world.add(m);
  }
  const jb = boxMesh(0.2, 0.2, 0.1, lam(0xa9aeb3)); jb.position.set(8.25, 2.45, zf - 0.05); world.add(jb);
}
for (const c of CT.controls) {
  ({ eaton: buildEaton, starter: buildStarter, airlock_box: buildAirlockBox, gate_panel: buildGatePanel, air_valve: buildAirValve,
    ball_valve: buildBallValve, hatch: buildHatch, bucket: buildBucket, hose_coupling: buildHose })[c.type]?.(c);
}
buildOutsideDressing();
// Flamex panels in the model: overlay a live face (LEDs) and make them clickable
const FXFACE = {};
for (const z of ['A', 'B']) {
  const n = NODE[CT.flamex.panels[z].node]; if (!n) continue;
  const b = new THREE.Box3().setFromObject(n), sz = b.getSize(new THREE.Vector3()), ctr = b.getCenter(new THREE.Vector3());
  const W = 256, H = Math.round(256 * sz.y / sz.x);
  const tex = canvasTex(W, H, () => {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 0.92, sz.y * 0.92), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(ctr.x, ctr.y, b.max.z + 0.003); world.add(m);
  tagClick(m, 'panel_' + z, 'panel');
  n.traverse(o => { if (o.isMesh) { o.userData.ctl = 'panel_' + z; o.userData.act = 'panel'; } });
  FXFACE[z] = { tex, W, H, last: '' };
}
function drawFxFace(z, blink) {
  const F = FXFACE[z]; if (!F) return;
  const Z = S.flamex[z], lamp = Z.lamp > 0;
  const key = [Z.fire && blink, Z.key, lamp, Z.spray > 0 && S.valve[CT.flamex.panels[z].valve].open, Z.horns].join();
  if (key === F.last) return; F.last = key;
  const g = F.tex.userData.g, W = F.W, H = F.H;
  g.fillStyle = z === 'A' ? '#8f969f' : '#e9e7e2'; g.fillRect(0, 0, W, H);
  if (z === 'B') { g.fillStyle = '#c62828'; g.fillRect(W - 70, 10, 60, 14); g.fillStyle = '#fff'; g.font = 'bold 10px Arial'; g.fillText('MINIMAX', W - 66, 21); }
  const fx = z === 'A' ? 14 : W * 0.22, fy = z === 'A' ? 14 : H * 0.36, fw = z === 'A' ? W - 28 : W * 0.56, fh = z === 'A' ? H - 28 : H * 0.3;
  g.fillStyle = '#9aa1aa'; g.fillRect(fx, fy, fw, fh);
  const led = (x, y, on, col, label) => { g.fillStyle = on ? col : '#444'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = 'bold 11px Arial'; g.fillText(label, x + 10, y + 4); };
  led(fx + 12, fy + 16, (Z.fire && blink) || lamp, '#ff2a2a', 'Fire');
  led(fx + 12, fy + 34, lamp, '#ffd21f', 'Fault');
  led(fx + 12, fy + 52, Z.key === 1 || lamp, '#ffd21f', z === 'A' ? 'Supervisory' : 'Disabled');
  led(fx + fw * 0.58, fy + 16, true, '#3dff6a', 'Operation');
  led(fx + fw * 0.58, fy + 34, (Z.spray > 0 && S.valve[CT.flamex.panels[z].valve].open) || lamp, '#ff2a2a', 'Extinguish');
  led(fx + fw * 0.58, fy + 52, Z.horns || lamp, '#ff2a2a', 'Horn');
  g.fillStyle = '#333'; g.font = 'bold 12px Arial'; g.fillText((z === 'A' ? 'FLE 5000' : 'FLAMEX') + '  key ' + Z.key, fx + 8, fy + fh - 8);
  F.tex.needsUpdate = true;
}

// lock + tag visuals
function buildLockVisual(id) {
  const C = CTL3[id]; if (!C || !C.lockG) return;
  C.lockG.clear();
  const L = lockable(id); if (!L.locked) return;
  const body = boxMesh(0.035, 0.03, 0.016, lam(0xc62828)); C.lockG.add(body);
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 12, Math.PI), lam(0xcccccc)); sh.position.y = 0.015; C.lockG.add(sh);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: canvasTex(64, 108, (x, W, H) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#c62828'; x.fillRect(0, 0, W, 30); x.fillStyle = '#fff'; x.font = 'bold 13px Arial'; x.fillText('DANGER', 4, 20);
    x.fillStyle = '#111'; x.font = '9px Arial'; x.fillText('DO NOT', 14, 46); x.fillText('OPERATE', 10, 58); x.fillText((L.lock?.name || '').slice(0, 11), 4, 80); x.fillText(L.lock?.date || '', 4, 94);
  }) }));
  tag.position.set(0.0, -0.07, 0.012); tag.rotation.z = 0.12; C.lockG.add(tag);
}

// update the look of the 3D controls each frame
function syncControls3D(dt) {
  for (const [id, C] of Object.entries(CTL3)) {
    const c = C.c;
    if (c.type === 'eaton') { const tgt = S.eaton[id].on ? 0.35 : 2.75; C.piv.rotation.x += (tgt - C.piv.rotation.x) * Math.min(1, dt * 12); }
    else if (c.type === 'starter') { C.gb.material.emissive.setHex(S.starter[id] ? 0x1f8f3f : 0x000000); }
    else if (c.type === 'airlock_box') {
      if (C.lcdOn !== S.airlockBox) { C.lcdOn = S.airlockBox; const t = C.tex; t.userData.draw = lcdDraw((S.airlockBox ? c.lcd_on : c.lcd_off).split('|')); t.userData.draw(t.userData.g, 160, 48); t.needsUpdate = true; }
    } else if (c.type === 'gate_panel') {
      for (const [gk, B] of Object.entries(C.btns)) { const o = S.gates[gk]; B.gb.material.emissive.setHex(o ? 0x2fd35a : 0); B.rb.material.emissive.setHex(o ? 0 : 0xc02020); }
    } else if (c.type === 'ball_valve') { const tgt = S.valve[id].open ? 0 : Math.PI / 2; C.piv.rotation.y += (tgt - C.piv.rotation.y) * Math.min(1, dt * 10); }
    else if (c.type === 'air_valve') { const tgt = S.air.on ? 0 : Math.PI / 2; C.piv.rotation.z += (tgt - C.piv.rotation.z) * Math.min(1, dt * 10); }
    else if (c.type === 'hatch') { const tgt = S.hatch[id].open ? -1.9 : 0; C.piv.rotation.x += (tgt - C.piv.rotation.x) * Math.min(1, dt * 8); }
    else if (c.type === 'bucket') {
      C.g.visible = S.bucket.placed || (PROC && PROC.id === 'flamex_weekly') || PANEL === 'flamex_A';
      const tp = V3(S.bucket.placed ? c.placed_pos : c.pos); C.g.position.lerp(tp, Math.min(1, dt * 6));
      const Z = S.flamex.A; if (S.bucket.placed && Z.spray > 0 && S.valve.valve_A.open && S.hatch.hatch_window.open) C.fill = Math.min(1, C.fill + dt / 7);
      if (!S.bucket.placed) C.fill = 0;
      C.water.visible = C.fill > 0.02; C.water.position.y = 0.02 + C.fill * 0.15;
    } else if (c.type === 'hose_coupling') { C.ring.material.color.setHex(S.hose.connected ? 0xcfa53a : 0xd42020); C.ring.position.x = S.hose.connected ? 0 : 0.35; }
  }
}

// ---------------------------------------------------------------- flow particles
const MAT = SC.materials;
const DRIVE = CT.behavior.flow.segment_drive;
const STREAMS = SC.streams.map((s, si) => {
  const P = [], segs = [];
  let L = 0;
  const machine = s.role === 'machine' ? s.machine : null;
  let beforeTrunk = !!machine;
  for (const sg of s.segments) {
    if (sg.name === 'trunk') beforeTrunk = false;
    const s0 = L;
    sg.pts.forEach((p, i) => {
      const v = V3(p);
      if (P.length) { const d = v.distanceTo(P[P.length - 1]); if (i === 0 && d < 1e-4) return; L += d; }
      P.push(v);
    });
    let drive = beforeTrunk ? 'gate' : (DRIVE[sg.name] ?? 'fan');
    segs.push({ name: sg.name, s0, s1: L, speed: sg.speed_mps, r: sg.duct_radius_m, inDuct: sg.in_duct, drive, exitReq: CT.behavior.flow.exit_requires[sg.name] || null });
  }
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
  // frames (parallel transport)
  const N = [], B = [];
  let prevN = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.min(i, P.length - 2)], b = P[Math.min(i + 1, P.length - 1)];
    const t = b.clone().sub(a); if (t.lengthSq() < 1e-12) t.set(1, 0, 0); t.normalize();
    let n;
    if (!prevN) { n = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); n.sub(t.clone().multiplyScalar(n.dot(t))).normalize(); }
    else { n = prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t))); if (n.lengthSq() < 1e-8) n = new THREE.Vector3(0, 1, 0).cross(t); n.normalize(); }
    N.push(n); B.push(t.clone().cross(n).normalize()); prevN = n;
  }
  const mat = MAT[s.material];
  const isAir = ['air_fine_dust', 'clean_air', 'return_air'].includes(s.material);
  const firstDrive = segs[0].drive;
  // where chips wait when the airlock is stopped: the airlock top (cone bottom)
  let pileBase = 0;
  const cs = segs.find(g => g.name === 'cone and airlock');
  if (cs) { const yTop = SC.airlock_pockets.center[1] + SC.airlock_pockets.radius_m[1]; pileBase = cs.s1; for (let i = 0; i < P.length - 1; i++) { if (cum[i] >= cs.s0 && cum[i] <= cs.s1 && P[i].y <= yTop) { pileBase = cum[i]; break; } } }
  return { ...s, si, P, cum, N, B, segs, pileBase, L: cum[cum.length - 1], mat, isAir, color: new THREE.Color(mat.display_hex), firstDrive,
    shape: mat.particle === 'arrow' ? 1 : 0, radius: mat.real_radius_m || ({ clean_air: 0.007, air_fine_dust: 0.009, return_air: 0.009 }[s.material] ?? 0.01), minPx: mat.min_radius_px || 1.5, streakS: mat.streak_s || 0 };
});
let total = 0;
for (const s of STREAMS) { s.count = Math.max(1, Math.round(s.density_per_m * s.length_m * (s.mat.density_multiplier || 1))); total += s.count; }
const BUDGET = +(Q.get('budget') || 17500);
const scaleK = total > BUDGET ? BUDGET / total : 1;
let NP = 0;
for (const s of STREAMS) { s.count = Math.max(1, Math.round(s.count * scaleK)); s.start = NP; NP += s.count; }
const PK = SC.airlock_pockets;
const NPOCK = PK.vanes * Math.min(PK.chips_per_pocket, 80);
const NFX = 420;
const NTOT = NP + NPOCK + NFX;
// particle state arrays
const pS = new Float32Array(NP), pIdx = new Int32Array(NP), pStream = new Uint16Array(NP), pU = new Float32Array(NP), pV = new Float32Array(NP),
  pState = new Uint8Array(NP), pTimer = new Float32Array(NP), pSettle = new Float32Array(NP), pSeg = new Uint16Array(NP), pRank = new Int32Array(NP).fill(-1),
  pK = new Float32Array(NP), pW = new Float32Array(NP), pA = new Float32Array(NP); // size factor, swirl rate, swirl angle
for (let i = 0; i < NP; i++) { pK[i] = 0.75 + 0.5 * Math.random(); pW[i] = (0.5 + Math.random()) * (Math.random() < 0.5 ? -1 : 1) * 2.2; pA[i] = Math.random() * 6.283; }
// state: 0 moving, 1 dormant, 2 piled
for (const s of STREAMS) {
  for (let k = 0; k < s.count; k++) {
    const i = s.start + k;
    pStream[i] = s.si;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    pU[i] = Math.cos(a) * r; pV[i] = Math.sin(a) * r;
    pS[i] = ((k + (Math.random() - 0.5) * 0.7) / s.count) * s.L; pS[i] = clamp(pS[i], 0, s.L - 1e-4);
    pState[i] = 1; pTimer[i] = Math.random() * s.duration_s;
  }
}
function locate(s, sv, i0) { // index of polyline segment containing arc length sv, searching from hint
  const c = s.cum; let i = clamp(i0, 0, c.length - 2);
  while (i < c.length - 2 && c[i + 1] < sv) i++;
  while (i > 0 && c[i] > sv) i--;
  return i;
}
function segAt(s, sv, j0 = 0) { let j = clamp(j0, 0, s.segs.length - 1); while (j < s.segs.length - 1 && s.segs[j].s1 <= sv) j++; while (j > 0 && s.segs[j].s0 > sv) j--; return j; }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _o = new THREE.Vector3();
function posAt(s, sv, i, out) {
  const c = s.cum, f = clamp((sv - c[i]) / Math.max(1e-6, c[i + 1] - c[i]), 0, 1);
  return out.copy(s.P[i]).lerp(s.P[i + 1], f);
}
// geometry + shader
const quad = new THREE.InstancedBufferGeometry();
quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
quad.setIndex([0, 1, 2, 0, 2, 3]);
const aHead = new THREE.InstancedBufferAttribute(new Float32Array(NTOT * 3), 3).setUsage(THREE.DynamicDrawUsage);
const aTail = new THREE.InstancedBufferAttribute(new Float32Array(NTOT * 3), 3).setUsage(THREE.DynamicDrawUsage);
const aCol = new THREE.InstancedBufferAttribute(new Float32Array(NTOT * 4), 4).setUsage(THREE.DynamicDrawUsage);
const aSize = new THREE.InstancedBufferAttribute(new Float32Array(NTOT * 3), 3).setUsage(THREE.DynamicDrawUsage);
quad.setAttribute('aHead', aHead); quad.setAttribute('aTail', aTail); quad.setAttribute('aCol', aCol); quad.setAttribute('aSize', aSize);
quad.instanceCount = NTOT;
const pMat = new THREE.ShaderMaterial({
  uniforms: { uVP: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `
    attribute vec3 aHead; attribute vec3 aTail; attribute vec4 aCol; attribute vec3 aSize;
    uniform vec2 uVP;
    varying vec2 vL; varying float vLen; varying float vR; varying vec4 vC; varying float vShape;
    void main(){
      vec4 ch = projectionMatrix * modelViewMatrix * vec4(aHead,1.0);
      vec4 ct = projectionMatrix * modelViewMatrix * vec4(aTail,1.0);
      if (aCol.a <= 0.002 || ch.w <= 0.02 || ct.w <= 0.02) { gl_Position = vec4(2.0,2.0,2.0,1.0); return; }
      vec2 sh = (ch.xy/ch.w*0.5+0.5)*uVP, st = (ct.xy/ct.w*0.5+0.5)*uVP;
      float mn = abs(aSize.y);
      float rpx = max(aSize.x * projectionMatrix[1][1] * uVP.y * 0.5 / ch.w, mn);
      if (aSize.y < 0.0) rpx = min(rpx, mn * 1.1); // air streaks keep a thin line even right at the camera
      vec2 d = sh - st; float len = length(d); vec2 dir = len > 0.001 ? d/len : vec2(1.0,0.0); vec2 nr = vec2(-dir.y, dir.x);
      float along = mix(-rpx, len + rpx, position.x);
      vec2 p = st + dir*along + nr*position.y*rpx;
      float f = clamp(along/max(len,0.001), 0.0, 1.0);
      vec4 c = mix(ct, ch, f);
      vec2 ndc = p/uVP*2.0 - 1.0;
      gl_Position = vec4(ndc*c.w, c.z, c.w);
      vL = vec2(along, position.y*rpx); vLen = len; vR = rpx; vC = aCol; vShape = aSize.z;
    }`,
  fragmentShader: `
    varying vec2 vL; varying float vLen; varying float vR; varying vec4 vC; varying float vShape;
    void main(){
      float x = vL.x, y = vL.y;
      float r = vR;
      if (vShape > 0.5 && vShape < 1.5) { float t = clamp(x/max(vLen,0.001),0.0,1.0); r = vR*mix(0.35,1.0,t); }
      float dx = x < 0.0 ? x : (x > vLen ? x - vLen : 0.0);
      float d = length(vec2(dx, y));
      if (d > r) discard;
      float a = vC.a;
      if (vShape > 1.5) a *= pow(1.0 - d/r, 1.6);
      else a *= clamp((r - d) / max(0.9, r * 0.55), 0.0, 1.0); // soft round edge
      gl_FragColor = vec4(vC.rgb, a);
    }`,
  transparent: true, depthWrite: false, depthTest: true
});
const particles = new THREE.Mesh(quad, pMat);
particles.frustumCulled = false; particles.renderOrder = 20;
scene.add(particles);

// motor levels and drive levels
function driveLevel(seg, s) {
  if (seg.drive === 'gate') return LV.fan * (gateLv[s.machine] ?? 0);
  return LV[seg.drive] ?? LV.fan;
}
const anyGate = () => Object.values(gateLv).some(v => v > 0.5);
function srcActive(s) {
  if (s.role === 'machine') return LV.fan > 0.35 && (gateLv[s.machine] ?? 0) > 0.5;
  if (s.role === 'conveyor') return LV.blower > 0.35;
  if (s.role === 'closeup') {
    if (s.firstDrive === 'blower') return LV.blower > 0.35 && LV.airlock > 0.5 && LV.fan > 0.35 && anyGate();
    return LV.fan > 0.35 && anyGate();
  }
  if (s.material === 'fine_dust') return LV.fan > 0.35 && anyGate();
  return LV.fan > 0.35;
}
// piles (chips held back when the airlock or the blower is off)
const PILE = { cone: [], tee: [] };
const pileCfg = CT.behavior.flow.pile;
let releaseAcc = { cone: 0, tee: 0 };
function initFlow(running) {
  PILE.cone.length = 0; PILE.tee.length = 0; pRank.fill(-1);
  for (const s of STREAMS) for (let k = 0; k < s.count; k++) {
    const i = s.start + k;
    if (running && srcActive(s)) { pState[i] = 0; pS[i] = clamp(((k + (Math.random() - 0.5) * 0.7) / s.count) * s.L, 0, s.L - 1e-4); }
    else { pState[i] = 1; pTimer[i] = Math.random() * s.duration_s; }
    pIdx[i] = locate(s, pS[i], 0); pSeg[i] = segAt(s, pS[i], 0); pSettle[i] = 0;
  }
}
const UPV = new THREE.Vector3(0, 1, 0);
function stepFlow(dt) {
  const hd = aHead.array, tl = aTail.array, cl = aCol.array, sz = aSize.array;
  // release from piles when the way is clear
  for (const k of ['cone', 'tee']) {
    const ok = k === 'cone' ? LV.airlock > 0.5 : LV.blower > 0.5;
    if (!ok || !PILE[k].length) { releaseAcc[k] = 0; continue; }
    releaseAcc[k] += dt * CT.behavior.flow.release_per_s;
    while (releaseAcc[k] >= 1 && PILE[k].length) {
      releaseAcc[k] -= 1;
      const i = PILE[k].shift(); pState[i] = 0; pRank[i] = -1;
      const s = STREAMS[pStream[i]];
      const jn = k === 'cone' ? s.segs.findIndex(g => g.name === 'floor line to blower') : s.segs.findIndex(g => g.name === 'floor line to blower');
      if (jn >= 0) { pS[i] = s.segs[jn].s0 + 0.001; pSeg[i] = jn; pIdx[i] = locate(s, pS[i], 0); }
    }
    PILE[k].forEach((i, r) => { pRank[i] = r; });
  }
  for (const s of STREAMS) {
    const active = srcActive(s);
    const col = s.color;
    for (let k = 0; k < s.count; k++) {
      const i = s.start + k, o3 = i * 3, o4 = i * 4;
      if (PFRAC < 1 && pState[i] !== 2 && (k * 0.6180339) % 1 > PFRAC) { cl[o4 + 3] = 0; continue; } // quality step: fewer particles
      let st = pState[i];
      if (st === 1) { // dormant: wait for the source
        if (active) { pTimer[i] -= dt; if (pTimer[i] <= 0) { st = pState[i] = 0; pS[i] = 0; pIdx[i] = 0; pSeg[i] = 0; pSettle[i] = 0; } }
        if (st === 1) { cl[o4 + 3] = 0; continue; }
      }
      let j = pSeg[i], seg = s.segs[j];
      let lev = 0;
      if (st === 0) {
        lev = driveLevel(seg, s);
        let sv = pS[i] + seg.speed * lev * dt;
        if (seg.exitReq && s.pileBase && sv >= s.pileBase && pS[i] < s.pileBase + 1e-3 && LV[seg.exitReq] < 0.5 && !s.isAir) { st = pState[i] = 2; PILE.cone.push(i); pRank[i] = PILE.cone.length - 1; sv = s.pileBase; }
        // crossing into the next segment
        while (sv >= seg.s1 && st === 0) {
          if (j === s.segs.length - 1) { // end of the stream: loop or go dormant
            if (active) { sv = 0; j = 0; } else { st = pState[i] = 1; pTimer[i] = Math.random() * s.duration_s * 0.5; break; }
          } else {
            if (seg.exitReq && LV[seg.exitReq] < 0.5) { st = pState[i] = 2; PILE.cone.push(i); pRank[i] = PILE.cone.length - 1; sv = s.pileBase; break; }
            const nx = s.segs[j + 1];
            if (nx.name === 'floor line to blower' && seg.name === 'cone and airlock' && LV.blower < 0.3) { st = pState[i] = 2; PILE.tee.push(i); pRank[i] = PILE.tee.length - 1; sv = nx.s0 + 0.001; j = j + 1; break; }
            j++;
          }
          seg = s.segs[j];
        }
        if (st === 1) { cl[o4 + 3] = 0; continue; }
        pS[i] = Math.min(sv, s.L - 1e-4); pSeg[i] = j; seg = s.segs[j];
      }
      // position
      let sv = pS[i];
      if (st === 2) { // piled: rank sets the place
        const r = pRank[i];
        if (s.segs[j].name === 'cone and airlock') sv = clamp(s.pileBase - 0.9 * (1 - Math.exp(-r * pileCfg.cone.spacing_m / 0.9)), 0, s.L);
        else sv = clamp(s.segs[j].s0 + 0.7 * (1 - Math.exp(-r * pileCfg.tee.spacing_m / 0.7)), 0, s.L - 1e-4);
      }
      pIdx[i] = locate(s, sv, pIdx[i]);
      const ii = pIdx[i];
      posAt(s, sv, ii, _a);
      lev = st === 0 ? driveLevel(seg, s) : 0;
      // offset in the duct (settles to the bottom when the flow stops); a gentle swirl around the duct axis
      const R = (seg.r || 0) * (s.jitter || 0);
      let u = pU[i], v = pV[i];
      if (!RM && st === 0 && seg.inDuct) {
        pA[i] += pW[i] * lev * dt;
        const ca = Math.cos(pA[i]), sa = Math.sin(pA[i]), u2 = u * ca - v * sa; v = u * sa + v * ca; u = u2;
      }
      _o.set(0, 0, 0).addScaledVector(s.N[ii], u * R).addScaledVector(s.B[ii], v * R);
      if (st === 2) {
        const isCone = seg.name === 'cone and airlock';
        const sp = isCone ? pileCfg.cone.spread_m : pileCfg.tee.spread_m;
        const h = isCone ? clamp((s.pileBase - sv) / 0.9, 0, 1) : 0.3;
        const rr = sp[0] + (sp[1] - sp[0]) * h;
        _o.set(pU[i] * rr, isCone ? 0 : -0.03 + pV[i] * 0.02, pV[i] * rr);
      } else if (!s.isAir && seg.inDuct) {
        const tgt = lev < 0.08 ? 1 : 0;
        pSettle[i] += (tgt - pSettle[i]) * Math.min(1, dt / (CT.behavior.flow.settle_s * 0.5));
        if (pSettle[i] > 0.001) { const vy = _o.y; _o.y = vy + ((-0.8 * seg.r) - vy) * pSettle[i]; }
      }
      _a.add(_o);
      hd[o3] = _a.x; hd[o3 + 1] = _a.y; hd[o3 + 2] = _a.z;
      // streak tail
      const tailLen = s.streakS * seg.speed * lev;
      if (tailLen > 0.002 && st === 0) {
        const ts = Math.max(0, sv - tailLen), ti = locate(s, ts, ii);
        posAt(s, ts, ti, _b).add(_o);
        tl[o3] = _b.x; tl[o3 + 1] = _b.y; tl[o3 + 2] = _b.z;
      } else { tl[o3] = _a.x; tl[o3 + 1] = _a.y; tl[o3 + 2] = _a.z; }
      let alpha = 1;
      if (s.isAir) alpha = st === 0 ? clamp(lev * 1.6, 0, 1) : 0;
      if (s.fade) alpha *= Math.sin(Math.PI * clamp(sv / s.L, 0, 1));
      else if (st === 0) alpha *= Math.min(clamp(sv / 0.3, 0, 1), clamp((s.L - sv) / 0.15, 0, 1)); // fade in and out, never pop
      cl[o4] = col.r; cl[o4 + 1] = col.g; cl[o4 + 2] = col.b; cl[o4 + 3] = alpha;
      const fadeSize = s.fade ? 0.4 + 0.6 * Math.sin(Math.PI * clamp(sv / s.L, 0, 1)) : 1;
      sz[o3] = s.radius * fadeSize * pK[i]; sz[o3 + 1] = (s.isAir ? -1 : 1) * s.minPx * pK[i]; sz[o3 + 2] = s.shape; // air streaks: negative = capped on screen
    }
  }
}
// airlock pockets (chips riding in the rotor)
const pockC = V3(PK.center), pockAxis = V3(PK.axis).normalize();
const pocket = Array.from({ length: PK.vanes }, () => ({ fill: false, prev: 0, a: 0 }));
const pockLocal = Array.from({ length: NPOCK }, () => ({ r: PK.radius_m[0] + Math.random() * (PK.radius_m[1] - PK.radius_m[0]) * 0.9, x: (Math.random() * 2 - 1) * PK.half_width_m * 0.9, a: (Math.random() - 0.5) * (Math.PI / PK.vanes) * 1.6 }));
const chipCol = new THREE.Color(MAT[PK.chip].display_hex);
function stepPockets(rotAngle, dt = 1 / 60) {
  const hd = aHead.array, tl = aTail.array, cl = aCol.array, sz = aSize.array;
  const per = NPOCK / PK.vanes;
  const arriving = (LV.fan > 0.35 && anyGate()) || PILE.cone.length > 0;
  const north = new THREE.Vector3(0, 0, -1);
  for (let k = 0; k < PK.vanes; k++) {
    const phi = (((k + 0.5) * 2 * Math.PI / PK.vanes + rotAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const P = pocket[k];
    if (P.prev > 5.5 && phi < 0.8) P.fill = arriving; // passes the top: fills under the cone
    if (P.prev < Math.PI && phi >= Math.PI) P.fill = false; // bottom: empties into the tee
    P.prev = phi;
    P.a += ((P.fill ? 1 : 0) - P.a) * Math.min(1, dt * 7);
    for (let q = 0; q < per; q++) {
      const i = NP + k * per + q, o3 = i * 3, o4 = i * 4, L = pockLocal[k * per + q];
      const ang = phi + L.a;
      _a.copy(pockC).addScaledVector(pockAxis, L.x).addScaledVector(UPV, Math.cos(ang) * L.r).addScaledVector(north, Math.sin(ang) * L.r);
      hd[o3] = tl[o3] = _a.x; hd[o3 + 1] = tl[o3 + 1] = _a.y; hd[o3 + 2] = tl[o3 + 2] = _a.z;
      cl[o4] = chipCol.r; cl[o4 + 1] = chipCol.g; cl[o4 + 2] = chipCol.b; cl[o4 + 3] = P.a;
      sz[o3] = 0.0035; sz[o3 + 1] = 1.6; sz[o3 + 2] = 0;
    }
  }
}
// FX particles (fireball, detector glows, strobes, water)
let fxN = 0;
const FX0 = NP + NPOCK;
function fxPut(p, q, color, alpha, radius, minPx, shape) {
  if (fxN >= NFX) return;
  const i = FX0 + fxN++, o3 = i * 3, o4 = i * 4, hd = aHead.array, tl = aTail.array, cl = aCol.array, sz = aSize.array;
  hd[o3] = p.x; hd[o3 + 1] = p.y; hd[o3 + 2] = p.z; tl[o3] = q.x; tl[o3 + 1] = q.y; tl[o3 + 2] = q.z;
  cl[o4] = color.r; cl[o4 + 1] = color.g; cl[o4 + 2] = color.b; cl[o4 + 3] = alpha;
  sz[o3] = radius; sz[o3 + 1] = minPx; sz[o3 + 2] = shape;
}
const FXC = { core: new THREE.Color(SC.flamex.fireball.core_color), puffs: SC.flamex.fireball.puff_colors.map(c => new THREE.Color(c)), glow: new THREE.Color(SC.flamex.fireball.glow[0]),
  det: new THREE.Color(SC.flamex.detectors.glow), water: new THREE.Color(SC.flamex.spray.color), strobe: new THREE.Color(SC.flamex.strobes.glow), light: new THREE.Color('#fff7c2') };
const ZP = {};
for (const z of ['A', 'B']) {
  const Zd = SC.flamex.zones[z], P = Zd.spark_path.map(V3), cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
  ZP[z] = { ...Zd, P, cum, noz: { o: V3(Zd.nozzle.origin), d: V3(Zd.nozzle.direction).normalize(), w: V3(Zd.nozzle.fan_axis).normalize() }, glow: Zd.detector_glow_points.map(V3) };
}
function zpAt(z, s, out) { const Z = ZP[z]; let i = 0; while (i < Z.cum.length - 2 && Z.cum[i + 1] < s) i++; const f = clamp((s - Z.cum[i]) / Math.max(1e-6, Z.cum[i + 1] - Z.cum[i]), 0, 1); return out.copy(Z.P[i]).lerp(Z.P[i + 1], f); }
function detGlow(age) { // detector glow after a trip: soft pulses that fade out
  const D = SC.flamex.detectors, fade = 1 - clamp(age / D.flash_for_s, 0, 1);
  return RM ? 0.8 * fade : fade * (0.5 + 0.5 * Math.sin(age * D.flash_hz * 2 * Math.PI - Math.PI / 2) * 0.9 + 0.05);
}
function stepFx(dt, t) {
  fxN = 0;
  const _p = new THREE.Vector3(), _q = new THREE.Vector3();
  // sparks
  if (DEMO) for (const sp of DEMO.sparks) {
    if (!sp.alive) continue;
    const Z = ZP[sp.zone];
    zpAt(sp.zone, sp.s, _p);
    const shrink = clamp((Z.s_nozzle_m - sp.s) / SC.flamex.fireball.shrink_over_last_m, 0, 1);
    for (let k = SC.flamex.fireball.flame_puffs; k >= 1; k--) {
      zpAt(sp.zone, Math.max(0, sp.s - k * SC.flamex.fireball.puff_spacing_m), _q);
      fxPut(_q, _q, FXC.puffs[k % 2], 0.85 * (1 - k / 12), 0.03 * shrink * (1 - k / 14), 1.5, 2);
    }
    fxPut(_p, _p, FXC.glow, 0.55, 0.12 * shrink + 0.02, 4, 2);
    fxPut(_p, _p, FXC.core, 1, SC.flamex.fireball.core_radius_m * shrink + 0.004, 2.5, 0);
  }
  for (const z of ['A', 'B']) {
    const Z = S.flamex[z], zp = ZP[z];
    // detector flash for 1.4 s after a trip
    if (Z.fire && Z.detectT != null && SIM.t - Z.detectT < SC.flamex.detectors.flash_for_s) {
      const age = SIM.t - Z.detectT, g1 = detGlow(age);
      if (g1 > 0.02) for (const g of zp.glow) fxPut(g, g, FXC.det, 0.8 * g1, 0.07, 6, 2);
    }
    // water fan from the nozzle
    const valve = S.valve[CT.flamex.panels[z].valve].open;
    if (Z.spray > 0 && valve) {
      const ramp = clamp(Z.sprayed / SC.flamex.spray.ramp_s, 0, 1), sp = SC.flamex.spray;
      const nd = Math.round(sp.droplets * ramp);
      for (let k = 0; k < nd; k++) {
        const a = ((k * 0.618034) % 1 * 2 - 1) * (zp.nozzle.spread_deg * Math.PI / 180);
        const ph = ((t * sp.cycle_per_s + k * 0.37) % 1);
        const reach = zp.nozzle.reach_m * Math.cos(a) * 1.05;
        const dir = _q.copy(zp.noz.d).multiplyScalar(Math.cos(a)).addScaledVector(zp.noz.w, Math.sin(a)).normalize();
        _p.copy(zp.noz.o).addScaledVector(dir, reach * ph);
        const tail = _p.clone().addScaledVector(dir, -Math.min(sp.droplet_len_m, reach * ph));
        fxPut(_p, tail, FXC.water, sp.opacity, 0.006, 1.6, 0);
      }
    }
  }
  // strobes
  // strobes: a soft pulse, not a hard on/off
  const strobe = S.flamex.A.horns || S.flamex.B.horns;
  const sv = strobe ? (RM ? 0.7 : Math.pow(0.5 + 0.5 * Math.sin(t * SC.flamex.strobes.flash_hz * 2 * Math.PI), 2.2)) : 0;
  if (sv > 0.02) for (const p of lensPos) fxPut(p, p, FXC.strobe, 0.85 * sv, 0.12, 10, 2);
  for (const m of FXN.lens) m.emissive.setRGB(sv, sv * 0.19, sv * 0.12);
  for (const z of ['A', 'B']) {
    const Z = S.flamex[z];
    const g1 = Z.fire && Z.detectT != null && SIM.t - Z.detectT < SC.flamex.detectors.flash_for_s ? detGlow(SIM.t - Z.detectT) : 0;
    for (const m of FXN.det[z]) m.emissive.setRGB(0.25 * g1, 0.69 * g1, g1);
    for (const m of FXN.panel[z]) m.emissive.setHex(Z.fire ? 0x553300 : 0x000000);
  }
  // flashlight beam
  if (SM.fl) {
    const c = CTL[CT.flamex.panels[SM.fl.zone].detector_hatch];
    const p = V3(c.pos);
    fxPut(p, p, FXC.light, 0.9 * clamp(SM.fl.t, 0, 1), 0.09, 8, 2);
  }
  // unused fx slots: hide
  const cl = aCol.array;
  for (let k = fxN; k < NFX; k++) cl[(FX0 + k) * 4 + 3] = 0;
}

// ---------------------------------------------------------------- Flamex demo (spark down the duct, zone A then zone B)
let DEMO = null;
function startDemo() {
  for (const z of ['A', 'B']) S.flamex[z] = { ...fxZone(), key: S.flamex[z].key };
  DEMO = { t: 0, sparks: [{ zone: 'A', s: 0, alive: false, start: 0.3, detected: false }, { zone: 'B', s: 0, alive: false, start: null, detected: false }], phase: 'A', resetAt: null, cam: 0 };
  setCaption(SC.flamex.captions[0].text);
  elFoot.innerHTML = t4(SC.flamex.footnote);
  elFoot.style.display = 'block'; placeFoot();
  if (TOG.follow) flyTo(SC.viewpoints.find(v => v.id === 'flamex').camera[0], 1.2);
  renderSide();
}
function stepDemo(dt) {
  if (!DEMO) return;
  DEMO.t += dt;
  const T = DEMO.t;
  for (const sp of DEMO.sparks) {
    const Z = ZP[sp.zone], zs = S.flamex[sp.zone];
    if (!sp.alive && sp.start != null && T >= sp.start && !sp.done) { sp.alive = true; sp.s = 0; }
    if (!sp.alive) continue;
    const v = sp.detected ? Z.spark_speed_mps.after_detection : Z.spark_speed_mps.before_detection;
    sp.s += v * dt;
    if (!sp.detected && sp.s >= Z.s_detector_m) {
      sp.detected = true;
      const tripped = trip(sp.zone, 'spark');
      if (!tripped) say(MSG.bypass_no_trip, 'bad');
      if (sp.zone === 'A') { setCaption(SC.flamex.captions[0].text); }
      else setCaption(SC.flamex.captions[2].text);
    }
    if (sp.s >= Z.s_nozzle_m - 0.05) {
      const watered = zs.spray > 0 && S.valve[CT.flamex.panels[sp.zone].valve].open;
      if (watered || sp.s >= Z.path_length_m) { sp.alive = false; sp.done = true; sp.endT = T; }
    }
    if (sp.zone === 'A' && sp.detected && !sp.camMoved && TOG.follow && T > 2.2) { sp.camMoved = true; setCaption(SC.flamex.captions[1].text); flyTo(SC.viewpoints.find(v => v.id === 'flamex').camera[3], 1.0); }
  }
  const A = DEMO.sparks[0], B = DEMO.sparks[1];
  if (B.start == null && A.done && S.flamex.A.spray <= 0) {
    B.start = T + 0.6;
    if (TOG.follow) flyTo(SC.viewpoints.find(v => v.id === 'flamex').camera[5], 1.2);
    setCaption(SC.flamex.captions[2].text);
  }
  if (B.done && S.flamex.B.spray <= 0 && DEMO.resetAt == null) { DEMO.resetAt = T + 1.5; setCaption(SC.flamex.captions[3].text); }
  if (DEMO.resetAt != null && T >= DEMO.resetAt) {
    for (const z of ['A', 'B']) Object.assign(S.flamex[z], { fire: false, buzzer: false, horns: false, extOff: false, spray: 0, cause: 0, by: null });
    toast(U.demo_reset);
    DEMO = null; setCaption(null); elFoot.style.display = 'none'; renderAll();
  }
}
function stepFlamex(dt) { SM.stepFlamex(dt); }

// ---------------------------------------------------------------- camera: orbit, tour, walk
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.09; controls.screenSpacePanning = true;
controls.maxDistance = 120; controls.minDistance = 0.3;
let MODE = 'orbit';
let CAMANIM = null; // {from:{p,t,fov}, keys:[...], t}
function fovFor(k) {
  const asp = camera.aspect;
  const h = (k.hfov_deg || 60) * Math.PI / 180;
  if (asp >= 16 / 9 - 0.01) return k.vfov_deg_16x9 || 2 * Math.atan(Math.tan(h / 2) / asp) * 180 / Math.PI;
  return Math.min(80, 2 * Math.atan(Math.tan(h / 2) / asp) * 180 / Math.PI);
}
function flyTo(key, dur = 0, after = null) {
  if (MODE === 'walk') return walkTo(key, dur, after); // keep the user's mode: the walker walks there instead
  const to = { p: V3(key.position), t: V3(key.target), fov: key.hfov_deg ? fovFor(key) : camera.fov };
  const dist = camera.position.distanceTo(to.p) + 0.5 * controls.target.distanceTo(to.t);
  const d = RM ? 0.001 : Math.max(dur, clamp(1.0 + dist * 0.08, 1.2, 2.8)); // longer trips take longer, always eased
  CAMANIM = { from: { p: camera.position.clone(), t: controls.target.clone(), fov: camera.fov }, to, d, t: 0, after, lift: Math.min(2.5, dist * 0.12) };
}
// walk mode: a tour step or the Flamex demo moves the walker to a standing spot facing the view's target
function walkTo(key, dur = 0, after = null) {
  const T = V3(key.target), P = V3(key.position);
  const h = new THREE.Vector3(P.x - T.x, 0, P.z - T.z); let hd = h.length();
  if (hd < 0.01) { h.set(0, 0, 1); hd = 1; }
  h.multiplyScalar(1 / hd);
  const d = clamp(hd, 2.2, 7);
  const to = T.clone().addScaledVector(h, d);
  to.y = groundY(to.x, to.z) + WALK.eye;
  const dist = camera.position.distanceTo(to);
  const dd = RM ? 0.001 : Math.max(dur, clamp(0.8 + dist * 0.12, 1.0, 3.0));
  const look0 = new THREE.Vector3(); camera.getWorldDirection(look0);
  CAMANIM = { walk: true, from: { p: camera.position.clone(), look: look0.add(camera.position) }, to: { p: to, look: T }, d: dd, t: 0, after };
}
function playKeys(keys, intro = 0) {
  // only the keys before the first hard cut (the video's cuts become one smooth flight)
  let ks = [keys[0]];
  for (let i = 1; i < keys.length; i++) { if (keys[i].t - keys[i - 1].t < 0.15) break; ks.push(keys[i]); }
  const t0 = ks[0].t; ks = ks.map(k => ({ ...k, t: k.t - t0 }));
  flyTo(ks[0], intro, () => { if (ks.length > 1 && !RM && MODE !== 'walk') CAMANIM = { keys: ks, t: 0 }; });
}
function camAt(keys, t) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  if (a === b || b.t - a.t < 0.15) return { p: V3(a.position), t: V3(a.target), fov: fovFor(a) };
  const f = smooth(clamp((t - a.t) / (b.t - a.t), 0, 1));
  return { p: V3(a.position).lerp(V3(b.position), f), t: V3(a.target).lerp(V3(b.target), f), fov: fovFor(a) + (fovFor(b) - fovFor(a)) * f };
}
function stepCam(dt) {
  if (!CAMANIM) return;
  const A = CAMANIM;
  A.t += dt;
  if (A.walk) {
    const f = ease(clamp(A.t / A.d, 0, 1));
    camera.position.copy(A.from.p).lerp(A.to.p, f);
    const look = A.from.look.clone().lerp(A.to.look, f);
    camera.lookAt(look);
    if (f >= 1) {
      const dir = A.to.look.clone().sub(camera.position).normalize();
      WALK.yaw = Math.atan2(-dir.x, -dir.z); WALK.pitch = clamp(Math.asin(dir.y), -1.3, 1.3);
      const cb = A.after; CAMANIM = null; if (cb) cb();
    }
    return;
  }
  if (A.keys) {
    const end = A.keys[A.keys.length - 1].t;
    const c = camAt(A.keys, Math.min(A.t, end));
    camera.position.copy(c.p); controls.target.copy(c.t); camera.fov = c.fov; camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    if (A.t >= end) CAMANIM = null;
    return;
  }
  const f = ease(clamp(A.t / A.d, 0, 1));
  camera.position.copy(A.from.p).lerp(A.to.p, f);
  camera.position.y += Math.sin(Math.PI * f) * (A.lift || 0); // a gentle arc over long trips
  controls.target.copy(A.from.t).lerp(A.to.t, f);
  camera.fov = A.from.fov + (A.to.fov - A.from.fov) * f; camera.updateProjectionMatrix();
  camera.lookAt(controls.target); // face the moving target the whole way
  if (f >= 1) { const cb = A.after; CAMANIM = null; if (cb) cb(); }
}
controls.addEventListener('start', () => { CAMANIM = null; if (ST) { ST.paused = true; renderCaption(); } });

// walk mode
const WALK = { yaw: 0, pitch: 0, keys: {}, joy: { x: 0, y: 0 }, eye: 1.65 };
const groundMeshes = ['Ctx_ShopFloorSlab', 'Ctx_Ground', 'Pad__slab', ...roomOf('Floor', 'Ground')].map(n => NODE[n]).filter(Boolean);
const rayDown = new THREE.Raycaster();
function groundY(x, z) {
  rayDown.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
  const hits = rayDown.intersectObjects(groundMeshes, true);
  return hits.length ? hits[0].point.y : 0.74;
}
function setMode(m) {
  MODE = m;
  if (m === 'walk') {
    CAMANIM = null; controls.enabled = false;
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    let p = camera.position.clone();
    if (p.y > 6 || p.x < -10 || p.x > 40 || p.z < -30 || p.z > 9) { p.set(7.6, 0, -14.6); d.set(0, 0, -1); }
    p.y = groundY(p.x, p.z) + WALK.eye;
    camera.position.copy(p);
    WALK.yaw = Math.atan2(-d.x, -d.z); WALK.pitch = 0;
    camera.fov = 70; camera.updateProjectionMatrix();
    elWalkHelp.innerHTML = t4(matchMedia('(pointer: coarse)').matches ? U.walk_help_touch : U.walk_help); elWalkHelp.style.display = 'block';
    elJoy.style.display = matchMedia('(pointer: coarse)').matches ? 'block' : 'none';
    setTimeout(() => { elWalkHelp.style.display = 'none'; }, 6000);
  } else {
    controls.enabled = true; elJoy.style.display = 'none'; elWalkHelp.style.display = 'none';
    if (m === 'orbit' && MODE_PREV === 'walk') { const d = new THREE.Vector3(); camera.getWorldDirection(d); controls.target.copy(camera.position).addScaledVector(d, 3); }
  }
  MODE_PREV = m;
  elCap._h = ''; renderCaption();
  renderSide();
}
let MODE_PREV = 'orbit';
window.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; WALK.keys[e.code] = true; });
window.addEventListener('keyup', e => { WALK.keys[e.code] = false; });
let drag = null;
renderer.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0 }; });
window.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  if (MODE === 'walk' && !joyActive) { WALK.yaw -= dx * 0.004; WALK.pitch = clamp(WALK.pitch - dy * 0.004, -1.3, 1.3); }
});
window.addEventListener('pointerup', e => {
  if (drag && drag.moved < 6 && e.target === renderer.domElement) pick(e);
  drag = null;
});
let joyActive = false;
elJoy.addEventListener('pointerdown', e => { joyActive = true; elJoy.setPointerCapture(e.pointerId); joyMove(e); e.stopPropagation(); });
elJoy.addEventListener('pointermove', e => { if (joyActive) joyMove(e); });
elJoy.addEventListener('pointerup', () => { joyActive = false; WALK.joy.x = WALK.joy.y = 0; elJoy.firstChild.style.transform = ''; });
function joyMove(e) {
  const r = elJoy.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const l = Math.hypot(x, y), k = l > 1 ? 1 / l : 1;
  WALK.joy.x = x * k; WALK.joy.y = y * k;
  elJoy.firstChild.style.transform = `translate(${WALK.joy.x * 36}px,${WALK.joy.y * 36}px)`;
}
function stepWalk(dt) {
  if (MODE !== 'walk' || CAMANIM) return;
  const K = WALK.keys;
  let f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - WALK.joy.y;
  let r = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + WALK.joy.x;
  if (K.KeyQ) WALK.yaw += dt * 1.6; if (K.KeyE) WALK.yaw -= dt * 1.6;
  const sp = (K.ShiftLeft || K.ShiftRight ? 3.4 : 1.5);
  const fw = new THREE.Vector3(-Math.sin(WALK.yaw), 0, -Math.cos(WALK.yaw)), rt = new THREE.Vector3(-fw.z, 0, fw.x);
  camera.position.addScaledVector(fw, f * sp * dt).addScaledVector(rt, r * sp * dt);
  const gy = groundY(camera.position.x, camera.position.z) + WALK.eye;
  camera.position.y += (gy - camera.position.y) * Math.min(1, dt * 8);
  const look = new THREE.Vector3(-Math.sin(WALK.yaw) * Math.cos(WALK.pitch), Math.sin(WALK.pitch), -Math.cos(WALK.yaw) * Math.cos(WALK.pitch));
  camera.lookAt(camera.position.clone().add(look));
}

// ---------------------------------------------------------------- scene views (the video's viewpoints)
let STOP = -1;
const VPS = SC.viewpoints;
function applyScene(vpId) { // what a viewpoint hides, cuts open and makes see-through (no camera, no labels)
  const v = VPS.find(x => x.id === vpId);
  HIDE_TOUR.clear(); tourOverride.clear();
  if (!v) { applyVisibility(); return; }
  for (const n of v.hide) if (!/_cut$/.test(n)) HIDE_TOUR.add(n);
  if (v.hide.some(n => CTX_WALL.includes(n))) for (const n of ROOM_WALLN) HIDE_TOUR.add(n); // the shop's own north wall hides with the explainer's
  for (const [k, sk] of Object.entries(SKINS)) if (v.hide.some(n => n.startsWith(SKIN_PRE[k]))) HIDE_TOUR.add(sk.name);
  for (const c of Object.values(CUT)) if (c.pieces.length) setCutOpen(c.key, v.cutaway && c.hide.some(n => v.hide.includes(n)), true);
  if (v.xray_alpha !== undefined) { const xa = Array.isArray(v.xray_alpha) ? v.xray_alpha[v.xray_alpha.length - 1][1] : v.xray_alpha; setXray(xa < 0.99); }
  EXPL.target = v.explode ? 1 : 0;
  applyVisibility();
}
function applyStop(i, animate = true) { // "More views": one of the video's viewpoints
  if (ST) storyStop();
  STOP = i; const v = VPS[i];
  applyScene(v.id);
  setCaption(v.captions && v.captions.length ? v.captions[0].text : null);
  if (v.id === 'flamex') { startDemo(); }
  if (animate && !(v.id === 'flamex' && TOG.follow)) playKeys(v.camera); else if (!animate) { const k = v.camera[v.camera.length - 1]; camera.position.copy(V3(k.position)); controls.target.copy(V3(k.target)); camera.fov = fovFor(k); camera.updateProjectionMatrix(); }
  showLabels(v.labels, v.id === 'exploded' ? 8 : 3);
  renderSide();
}
function applyViewVis(v) {
  for (const g of (v.hide || [])) { TOG[g] = false; }
  for (const g of (v.show || [])) { TOG[g] = true; tourOverride.add(g); }
  applyVisibility(); renderSide();
}

// ---------------------------------------------------------------- labels: laid out on screen every frame, never overlapping
// Sources, highest priority first: procedure controls, the selected part, then the story step (or the viewpoint).
const LSRC = { proc: [], sel: [], story: [], zone: [], view: [], max: 3 };
const LB = new Map(); // key -> {el, ln, dot, p, prio, x, y, w, h, shown}
const SVGNS = 'http://www.w3.org/2000/svg';
const elLead = document.createElementNS(SVGNS, 'svg'); elLead.id = 'leaders'; elLabels.appendChild(elLead);
function anchorOf(a) { // [x,y,z] | scene label id | {node} | {ctl}
  if (!a) return null;
  if (Array.isArray(a)) return V3(a);
  if (typeof a === 'string') { const L = SC.labels.find(l => l.id === a); return L && L.anchor ? V3(L.anchor) : null; }
  if (a.node) { const n = NODE[a.node]; if (!n) return null; const c = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()); if (a.dy) c.y += a.dy; return c; }
  if (a.ctl) {
    if (/^panel_/.test(a.ctl)) return anchorOf({ node: CT.flamex.panels[a.ctl.slice(6)].node });
    const c = CTL[a.ctl]; if (!c) return null; const p = V3(c.pos); p.y += (c.size ? c.size[1] / 2 : 0.08) + 0.02; return p;
  }
  return null;
}
function showLabels(ids, max = 3) { // a viewpoint's labels: the short title only
  LSRC.view = (ids || []).map(id => { const L = SC.labels.find(l => l.id === id); return L && L.anchor ? { key: id, text: L.text, a: id, accent: L.accent ? MAT[L.accent]?.display_hex : null, when: L.shot === 'exploded' ? () => EXPL.e > 0.5 : null } : null; }).filter(Boolean);
  LSRC.max = max;
  refreshLabels();
}
function refreshLabels() {
  const specs = [...LSRC.proc, ...LSRC.sel, ...(ST ? LSRC.story : []), ...LSRC.zone, ...(ST ? [] : LSRC.view)];
  const keep = new Set();
  specs.forEach((s, k) => {
    const p = s.p || anchorOf(s.a); if (!p) return;
    keep.add(s.key);
    let it = LB.get(s.key);
    if (!it) {
      const el = document.createElement('div'); el.className = 'lab';
      const ln = document.createElementNS(SVGNS, 'line'), dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('r', '3.4');
      elLead.append(ln, dot); elLabels.appendChild(el);
      it = { key: s.key, el, ln, dot, x: 0, y: 0, shown: false, slot: -1 };
      LB.set(s.key, it);
    }
    const html = t4(s.text);
    if (it.html !== html) { it.el.innerHTML = html; it.html = html; it.w = 0; }
    it.p = p; it.prio = k; it.dead = false; it.when = s.when || null;
    const col = s.accent || '#7a8594';
    it.el.style.borderLeftColor = col; it.ln.setAttribute('stroke', col); it.dot.setAttribute('fill', col);
  });
  for (const it of LB.values()) {
    if (keep.has(it.key) || it.dead) continue;
    it.dead = true; showLab(it, false);
    setTimeout(() => { if (it.dead) { it.el.remove(); it.ln.remove(); it.dot.remove(); LB.delete(it.key); } }, 500);
  }
}
function showLab(it, on) {
  if (it.shown === on) return;
  it.shown = on;
  it.el.classList.toggle('on', on); it.ln.classList.toggle('on', on); it.dot.classList.toggle('on', on);
}
const SLOTS = [];
for (const d of [24, 48, 80, 118]) for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [1, 0], [-1, 0]]) SLOTS.push({ dx, dy, d });
function slotRect(it, s) {
  const cx = it.ax + s.dx * s.d, cy = it.ay + s.dy * s.d * 0.75;
  const x0 = s.dx > 0 ? cx : s.dx < 0 ? cx - it.w : cx - it.w / 2, y0 = s.dy > 0 ? cy : s.dy < 0 ? cy - it.h : cy - it.h / 2;
  return { x0, y0, x1: x0 + it.w, y1: y0 + it.h };
}
const ovl = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 + pad > b.x0 && a.y0 < b.y1 + pad && a.y1 + pad > b.y0;
function nearOnRect(x, y, r) { return { x: clamp(x, r.x0, r.x1), y: clamp(y, r.y0, r.y1) }; }
function segHitsRect(x0, y0, x1, y1, r) { // does the leader line cross a box?
  for (let k = 1; k < 12; k++) { const f = k / 12, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f; if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true; }
  return false;
}
let LREP = { shown: 0, overlaps: 0, offscreen: 0 };
const _pp = new THREE.Vector3();
function placeLabels(dt) {
  if (!LB.size) return;
  const W = elStage.clientWidth, H = elStage.clientHeight, sr = elStage.getBoundingClientRect();
  // things labels must not cover: the status chips, the cards, the story bar, the help
  const obs = [];
  const addRect = (el) => {
    if (!el || el.style.display === 'none' || !el.offsetParent) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    obs.push({ x0: r.left - sr.left - 6, y0: r.top - sr.top - 6, x1: r.right - sr.left + 6, y1: r.bottom - sr.top + 6 });
  };
  for (const c of elHud.children) addRect(c);
  for (const c of elRight.children) addRect(c);
  addRect(elCap); addRect(elFoot); addRect(elWalkHelp); addRect(elJoy);
  const items = [...LB.values()].filter(it => !it.dead).sort((a, b) => a.prio - b.prio);
  for (const it of items) if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
  let nOk = 0;
  for (const it of items) {
    _pp.copy(it.p).project(camera);
    it.ax = (_pp.x * 0.5 + 0.5) * W; it.ay = (-_pp.y * 0.5 + 0.5) * H;
    it.ok = TOG.labels && MODE !== 'walk' && _pp.z < 1 && _pp.z > -1 && it.ax > 10 && it.ax < W - 10 && it.ay > 10 && it.ay < H - 10 && (!it.when || it.when());
    if (it.ok && obs.some(o => it.ax > o.x0 && it.ax < o.x1 && it.ay > o.y0 && it.ay < o.y1)) it.ok = false; // anchor hidden under a card
    if (it.ok && ++nOk > LSRC.max) it.ok = false; // at most a few at once
  }
  const anchors = items.filter(i => i.ok).map(i => ({ x0: i.ax - 6, y0: i.ay - 6, x1: i.ax + 6, y1: i.ay + 6, it: i }));
  const placed = [];
  for (const it of items) {
    let target = null;
    if (it.ok) {
      const tries = it.slot >= 0 ? [it.slot, ...SLOTS.keys()] : [...SLOTS.keys()]; // keep the same side if it still fits
      for (const si of tries) {
        const r = slotRect(it, SLOTS[si]);
        if (r.x0 < 8 || r.y0 < 8 || r.x1 > W - 8 || r.y1 > H - 8) continue;
        if (placed.some(q => ovl(r, q, 6)) || obs.some(o => ovl(r, o)) || anchors.some(a => a.it !== it && ovl(r, a, 2))) continue;
        const lp = nearOnRect(it.ax, it.ay, r);
        if (placed.some(q => segHitsRect(it.ax, it.ay, lp.x, lp.y, q))) continue;
        target = r; it.slot = si; break;
      }
    }
    if (target) {
      placed.push(target); it.tx = target.x0; it.ty = target.y0;
      if (!it.shown) { it.x = it.tx; it.y = it.ty; }
      showLab(it, true);
    } else { showLab(it, false); it.slot = -1; }
  }
  // glide to the new place; if two would touch on the way, jump straight there
  const k = RM ? 1 : 1 - Math.exp(-dt * 12);
  const vis = items.filter(it => it.shown);
  for (const it of vis) { it.x += (it.tx - it.x) * k; it.y += (it.ty - it.y) * k; }
  for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
    const A = vis[a], B = vis[b];
    if (A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y) { A.x = A.tx; A.y = A.ty; B.x = B.tx; B.y = B.ty; }
  }
  let over = 0, off = 0;
  for (const it of vis) {
    it.el.style.transform = `translate(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px)`;
    const r = { x0: it.x, y0: it.y, x1: it.x + it.w, y1: it.y + it.h }, lp = nearOnRect(it.ax, it.ay, r);
    it.ln.setAttribute('x1', it.ax.toFixed(1)); it.ln.setAttribute('y1', it.ay.toFixed(1)); it.ln.setAttribute('x2', lp.x.toFixed(1)); it.ln.setAttribute('y2', lp.y.toFixed(1));
    it.dot.setAttribute('cx', it.ax.toFixed(1)); it.dot.setAttribute('cy', it.ay.toFixed(1));
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > W || r.y1 > H) off++;
    for (const q of vis) if (q !== it && q.x < r.x1 && q.x + q.w > r.x0 && q.y < r.y1 && q.y + q.h > r.y0) over++;
    for (const o of obs) if (ovl(r, { x0: o.x0 + 6, y0: o.y0 + 6, x1: o.x1 - 6, y1: o.y1 - 6 })) over++;
  }
  LREP = { shown: vis.length, overlaps: over, offscreen: off, keys: vis.map(i => i.key) };
}

// ---------------------------------------------------------------- picking
const ray = new THREE.Raycaster();
let SEL = null; // {part, node}
let TOOL = null;
function visibleDeep(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(m, camera);
  const list = pickables.filter(visibleDeep).concat(clickables.filter(visibleDeep));
  const hits = ray.intersectObjects(list, false);
  for (const h of hits) {
    const o = h.object;
    if (o.userData.ctl) { clickControl(o.userData); return; }
    // skip see-through x-ray surfaces for the shed/shop walls so clicks reach the parts inside
    const nd = topNode(o);
    const part = PARTS.find(p => p.re.test(nd.name));
    if (!part) { if (/^(Ctx_|Pad__|Enc__roof)/.test(nd.name)) continue; continue; }
    if (part.id === 'shed' && hits.some(h2 => h2 !== h && PARTS.some(p => p.id !== 'shed' && p.re.test(topNode(h2.object).name)))) continue;
    selectPart(part, nd.name);
    return;
  }
  clearSel();
}
function clickControl(u) {
  const id = u.ctl, act = u.act;
  if (TOOL === 'flashlight') {
    const c = CTL[id];
    if (c && c.type === 'hatch' && c.detector) { shine(c.zone); TOOL = null; document.body.classList.remove('tool-on'); renderAll(); return; }
  }
  if (/^panel_/.test(id)) { openPanel('flamex_' + id.slice(6)); return; }
  const c = CTL[id];
  switch (c.type) {
    case 'eaton': if (act === 'handle') setEaton(id, !S.eaton[id].on); openPanel(c.where === 'outside' ? 'outside' : 'collector'); break;
    case 'starter': if (act === 'start' || act === 'stop') pressStarter(id, act); openPanel('collector'); break;
    case 'airlock_box': if (act === 'on' || act === 'off') pressAirlockBox(act); openPanel('collector'); break;
    case 'gate_panel': if (act === 'open' || act === 'close') setGate(u.gate, act === 'open'); openPanel('gate_panel'); break;
    case 'air_valve': setAir(!S.air.on); openPanel('gate_panel'); break;
    case 'ball_valve': setValve(id, !S.valve[id].open); openPanel('flamex_' + c.zone); break;
    case 'hatch': toggleHatch(id); break;
    case 'bucket': S.bucket.placed = !S.bucket.placed; say(S.bucket.placed ? MSG.bucket_placed : MSG.bucket_removed); result('bucket', S.bucket.placed ? 'place' : 'remove', 'ok'); break;
    case 'hose_coupling': S.hose.connected = !S.hose.connected; say(S.hose.connected ? MSG.hose_on : MSG.hose_off); result('hose', S.hose.connected ? 'connect' : 'disconnect', 'ok'); break;
  }
  renderAll();
}
// ---------------------------------------------------------------- overlays: soft outline (rim glow), air zones, meeting points
const rimMat = (hex, a) => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color(hex) }, uA: { value: a } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV;
    void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uCol, uA * (0.12 + 0.88 * pow(r, 2.0))); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
});
// overlays: one merged mesh per node (few draw calls), in the node's own frame so it follows the node
const MERGED = new Map();
function mergedGeo(nd) {
  if (MERGED.has(nd.name)) return MERGED.get(nd.name);
  nd.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(nd.matrixWorld).invert(), rel = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const P = [], N = [], I = []; let base = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  nd.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const g = o.geometry, pa = g.attributes.position, na = g.attributes.normal;
    rel.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(rel);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(rel); P.push(v.x, v.y, v.z);
      if (na) { n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N.push(n.x, n.y, n.z); } else N.push(0, 1, 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(base + g.index.getX(i));
    else for (let i = 0; i < pa.count; i++) I.push(base + i);
    base += pa.count;
  });
  let geo = null;
  if (base) {
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setIndex(base > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
  }
  MERGED.set(nd.name, geo);
  return geo;
}
function overlayInto(g, names, mat) { // overlay copies of the named nodes (they follow the node every frame)
  g.clear();
  for (const nm of names) {
    const nd = NODE[nm]; if (!nd) continue;
    const geo = mergedGeo(nd); if (!geo) continue;
    const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.renderOrder = 6; m.frustumCulled = false; m.userData.src = nd; m.userData.top = nm; g.add(m);
  }
  return g;
}
function syncOverlay(g) {
  for (const m of g.children) {
    const o = m.userData.src;
    m.visible = visibleDeep(o) && !CUTSWEEP.has(m.userData.top);
    if (m.visible) m.matrix.copy(o.matrixWorld);
  }
}
// selected part: blue soft outline
const selMat = rimMat('#2f7bff', 0.9);
const selGroup = new THREE.Group(); scene.add(selGroup);
function highlightNodes(names) { overlayInto(selGroup, names.slice(0, 60), selMat); }
// the part the story step explains: a gently breathing outline
const stoMat = rimMat('#ffffff', 0.8);
const stoGroup = new THREE.Group(); scene.add(stoGroup);
function highlightStory(names) { overlayInto(stoGroup, names, stoMat); }
// air zones (same colors as the flow map)
const ZONES = {
  suction: { hex: '#f08a24', nodes: ['Duct_Trunk_East', 'Duct_Trunk_Main', 'Duct_Trunk_North', 'Duct_Branch_CNC1', 'Duct_Branch_CNC2', 'Duct_Branch_EB1', 'Duct_Branch_EB2', 'Duct_Branch_PanelSaw', 'Duct_Branch_BinDrop',
    'Duct_Hose_CNC1', 'Duct_Hose_CNC2', 'Duct_Hose_PanelSaw', 'Duct_BinHose', 'Gate_CNC1', 'Gate_CNC2', 'Gate_EB1', 'Gate_EB2', 'Gate_PanelSaw', 'DC_InletDuct', 'Fix_InletSpool_Sleeve', 'Cyc__barrel', 'Cyc__cone', 'Cyc__barrel_cut', 'Cyc__cone_cut'] },
  push: { hex: '#3b82f6', nodes: ['DC_FanDuct', 'FL__plenum', 'FL__hopper', 'FL__sleeve', 'FL__cart0', 'FL__cart0_cut', 'FL__cart1', 'FL__cart2', 'FL__cart3', 'FL__top'] },
  loop: { hex: '#12a594', nodes: ['AL__tee', 'DC_ConveyLow', 'DC_ConveyPipe', 'DC_ConveyHoses', 'BL__feed'] }
};
for (const z of Object.values(ZONES)) {
  z.f = 0;
  z.mat = new THREE.MeshBasicMaterial({ color: z.hex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  z.g = new THREE.Group(); z.g.visible = false; scene.add(z.g); overlayInto(z.g, z.nodes, z.mat);
}
// where the systems meet: main fan (suction | push), airlock (suction | chip loop), transfer blower (drives the loop)
const MEET = { f: 0, mat: rimMat('#ffc94d', 0), g: new THREE.Group() };
scene.add(MEET.g); MEET.g.visible = false;
overlayInto(MEET.g, ['Fan__scroll', 'Fan__scroll_cut', 'AL__body', 'AL__body_cut', 'BL__housing', 'BL__housing_cut'], MEET.mat);
function stepOverlays(dt) {
  const k = RM ? 1 : Math.min(1, dt * 3);
  const focus = ST ? curStep().zone : null;
  for (const [id, z] of Object.entries(ZONES)) {
    const tgt = TOG.zones || focus === id ? 1 : 0;
    z.f += (tgt - z.f) * k;
    z.mat.opacity = 0.42 * z.f;
    z.g.visible = z.f > 0.01;
    if (z.g.visible) syncOverlay(z.g);
  }
  MEET.f += ((TOG.zones || (ST && curStep().meet) ? 1 : 0) - MEET.f) * k;
  MEET.mat.uniforms.uA.value = MEET.f * (RM ? 0.8 : 0.6 + 0.35 * Math.sin(SIM.t * 2.2));
  MEET.g.visible = MEET.f > 0.01;
  if (MEET.g.visible) syncOverlay(MEET.g);
  stoMat.uniforms.uA.value = RM ? 0.75 : 0.62 + 0.22 * Math.sin(SIM.t * 1.8);
  if (stoGroup.children.length) syncOverlay(stoGroup);
  if (selGroup.children.length) syncOverlay(selGroup);
}
function partNodes(part, nodeName) {
  if (part.id === 'machine') { const pre = nodeName.match(/^(CNC1_|CNC2_|EB_1_|EB_2_|PanelSaw_)/)[1]; return Object.keys(NODE).filter(n => n.startsWith(pre) && NODE[n].parent && NODE[n].parent.parent === world); }
  if (part.id === 'branch' || part.id === 'gate') return [nodeName];
  return Object.keys(NODE).filter(n => part.re.test(n) && NODE[n].parent && NODE[n].parent.parent === world);
}
function selectPart(part, nodeName) {
  SEL = { part, node: nodeName };
  const nodes = partNodes(part, nodeName);
  highlightNodes(nodes);
  { const b = new THREE.Box3(); for (const n of nodes) if (NODE[n] && !/_cut$|_liner$/.test(n)) b.expandByObject(NODE[n]); // its name, on screen
    if (!b.isEmpty()) { const p = b.getCenter(new THREE.Vector3()); const mm = part.id === 'machine' ? SC.machines.find(x => x.id === machineOf(nodeName)) : null; LSRC.sel = [{ key: 'sel_' + part.id + nodeName, text: mm ? mm.name : part.name, p, accent: '#2f7bff' }]; refreshLabels(); } }
  if (part.cut && !CUT[part.cut].open) { setCutOpen(part.cut, true); if (part.cut !== 'ducts') { TOG.shed_walls = false; TOG.shed_roof = false; applyVisibility(); } }
  renderInfo();
}
function clearSel() { SEL = null; selGroup.clear(); LSRC.sel = []; refreshLabels(); renderInfo(); }

// ---------------------------------------------------------------- UI rendering
function machineOf(nodeName) {
  const m = nodeName.match(/(CNC1|CNC2|EB1|EB2|PanelSaw|EB_1|EB_2)/); if (!m) return null;
  return { EB_1: 'EB1', EB_2: 'EB2' }[m[1]] || m[1];
}
function flowHex(f) { return f ? (f.startsWith('#') ? f : MAT[f]?.display_hex) : '#888'; }
function rpmLine(m) {
  const d = CT.motors[m], r = SC.rotating.find(x => x.node === d.rotating[0]);
  const real = r.real_rpm, now = Math.round(real * LV[m]);
  const st = motorStatus(m);
  return `${t4(U.real_speed)}<div><b>${now.toLocaleString('en-US')}</b> / ${real.toLocaleString('en-US')} rpm` + (r.display_rpm !== r.real_rpm ? ` <span class="note">(${esc(tx(U.shown_at, LANG === 'all' ? 'en' : LANG))} ${r.display_rpm} rpm)</span>` : '') + `</div>${t4(st.label)}`;
}
function renderInfo() {
  let el = $('#info');
  if (!SEL) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'info'; el.className = 'card'; elRight.prepend(el); }
  const p = SEL.part, mach = machineOf(SEL.node);
  let name = p.name;
  if (p.id === 'machine' || p.id === 'branch' || p.id === 'gate') {
    const mm = SC.machines.find(x => x.id === mach);
    if (mm) name = p.id === 'machine' ? mm.name : Object.fromEntries(LANGS.map(l => [l, tx(p.name, l) + ': ' + tx(mm.name, l)]));
  }
  let facts = (p.facts || []).map(f => `<li>${t4(f)}</li>`).join('');
  if (p.motor) facts = `<li>${rpmLine(p.motor)}</li>` + facts;
  if (p.id === 'machine' && mach === 'EB1') facts += `<li>${t4(SC.labels.find(l => l.id === 'app.eb1_head').text)}</li><li>${t4(SC.labels.find(l => l.id === 'app.eb1_last').text)}</li>`;
  if ((p.id === 'gate' || p.id === 'machine' || p.id === 'branch') && mach) facts += `<li>${t4(S.gates[mach] ? U.open : U.closed)}</li>`;
  const flows = p.id === 'machine' && mach === 'EB1' ? [MAT.sawdust_chips.display_hex, MAT.pvc_chips.display_hex] : [flowHex(p.flow)];
  const stripe = flows.length > 1 ? `linear-gradient(90deg,${flows[0]} 50%,${flows[1]} 50%)` : flows[0];
  const acts = [];
  if (p.cut) acts.push(`<button class="b" data-cut="${p.cut}">${b4(CUT[p.cut].open ? U.close_cut : U.open_cut)}</button>`);
  if (p.panel) acts.push(`<button class="b" data-panel="${p.panel}">${b4(U.open_panel)}</button>`);
  if (p.view) acts.push(`<button class="b" data-view="${p.view}">${b4(U.go_there)}</button>`);
  el.innerHTML = `<div class="stripe" style="background:${stripe}"></div><div class="in"><div class="top"><h3>${t4(name)}</h3><button class="x" aria-label="Close">×</button></div>
    <div style="margin-top:6px">${t4(p.desc)}</div><ul class="facts">${facts}</ul><div class="acts">${acts.join('')}</div></div>`;
  el.querySelector('.x').onclick = clearSel;
  el.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { const k = b.dataset.cut; setCutOpen(k, !CUT[k].open); if (CUT[k].open && k !== 'ducts') { TOG.shed_walls = false; TOG.shed_roof = false; applyVisibility(); } renderInfo(); });
  el.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => openPanel(b.dataset.panel));
  el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { const i = VPS.findIndex(v => v.id === b.dataset.view); if (i >= 0) { const v = VPS[i]; flyTo(v.camera[v.camera.length - 1], 1.2); } });
}
function motorStatus(m) {
  const d = CT.motors[m], st = S.motor[m];
  if (motorLocked(m)) return { label: U.locked, cls: 'lock' };
  if (st.running) return { label: U.running, cls: 'run' };
  if (S.starter[d.starter] && !motorPowered(m)) return { label: U.latched_nopower, cls: 'lock' };
  if (!motorPowered(m)) return { label: U.nopower, cls: 'lock' };
  if (LV[m] > 0.01) return { label: U.coasting, cls: '' };
  return { label: U.stopped, cls: '' };
}
let hudKey = '';
function placeFoot() { // the demo footnote sits just under the status chips, never on them
  elFoot.style.top = (elHud.offsetTop + elHud.offsetHeight + 6) + 'px';
}
function fitRight() { // the cards on the right stop above the story bar
  const capOn = elCap.style.display === 'block' && elCap.offsetHeight > 0;
  const lim = capOn ? elCap.offsetTop - elRight.offsetTop - 12 : elStage.clientHeight - 90;
  const v = Math.max(160, lim) + 'px';
  if (elRight.style.maxHeight !== v) elRight.style.maxHeight = v;
}
function renderHud() {
  const parts = [];
  for (const m of ['fan', 'blower', 'airlock']) { const s = motorStatus(m); parts.push([`${m}`, s.cls, tx(U[m + '_s'], LANG === 'all' ? 'en' : LANG) + ': ' + tx(s.label, LANG === 'all' ? 'en' : LANG)]); }
  const g = Object.values(S.gates).filter(Boolean).length;
  parts.push(['g', g ? 'run' : '', tx(U.gates_s, LANG === 'all' ? 'en' : LANG) + ': ' + g]);
  for (const z of ['A', 'B']) { const Z = S.flamex[z]; parts.push(['fx' + z, Z.fire ? 'fire' : Z.key ? 'byp' : 'run', 'Flamex ' + z + ': ' + tx(Z.fire ? U.fire : Z.key ? U.bypass : U.normal, LANG === 'all' ? 'en' : LANG)]); }
  const key = JSON.stringify(parts);
  if (key === hudKey) return; hudKey = key;
  elHud.innerHTML = parts.map(([, c, t]) => `<span class="chip ${c}"><i></i>${esc(t)}</span>`).join('');
  placeFoot();
}

// ---------- 2D panel views
let PANEL = null;
function openPanel(id) { PANEL = id; renderPanel(); }
function closePanel() { PANEL = null; renderPanel(); }
function eatonHTML(id) {
  const c = CTL[id], e = S.eaton[id];
  const tag = e.locked ? `<div class="tag">DANGER</div>` : '';
  return `<div class="eat">${tag}<div class="lbl">EATON</div>${c.amps ? `<div class="amps">${c.amps} A</div>` : ''}
    <button class="hdl ${e.on ? '' : 'off'}" data-eaton="${id}" title="ON / OFF"></button><div class="st">${e.on ? 'ON' : 'OFF'}</div>
    <button class="lockb" data-lock="${id}">${esc(tx(e.locked ? U.remove_lock : U.lock_tag, LANG === 'all' ? 'en' : LANG))}</button>
    <div class="note" style="color:#222;font-size:10px;margin-top:4px">${esc(tx(c.name, LANG === 'all' ? 'en' : LANG))}</div></div>`;
}
function starterHTML(id) {
  const c = CTL[id], on = S.starter[id];
  return `<div class="sta"><div class="num">${esc(c.number)}</div>${c.printed ? `<div style="font:700 9px Arial">${esc(c.printed)}</div>` : ''}
    <div><button class="pb g ${on ? 'lit' : ''}" data-start="${id}" title="Start"></button><button class="pb r" data-stop="${id}" title="Stop"></button></div>
    <div class="nm">${esc(tx(CT.motors[c.motor].name, 'en').toUpperCase())}</div></div>`;
}
function lockLine(id) {
  const L = lockable(id); if (!L || !L.locked) return '';
  return `<div class="note">🔒 ${esc(L.lock.name)}, ${esc(L.lock.date)}: ${esc(L.lock.reason)}</div>`;
}
function renderPanel() {
  let el = $('#panelv');
  if (!PANEL) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'panelv'; el.className = 'card'; elRight.appendChild(el); }
  let title, body = '', foot = '';
  const L1 = LANG === 'all' ? 'en' : LANG;
  if (PANEL === 'collector') {
    title = U.p_collector;
    body = `<div class="pv"><div class="wall">
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${eatonHTML('eaton_in_left')}${starterHTML('starter3')}</div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${eatonHTML('eaton_in_right')}<div style="display:flex;gap:6px">${starterHTML('starter2')}${starterHTML('starter1')}</div></div>
      <div class="alb"><div style="display:flex;flex-direction:column;gap:4px"><button class="pb g ${S.airlockBox ? 'lit' : ''}" data-albox="on"></button><button class="pb r" data-albox="off"></button></div>
        <div class="lcd">${esc((S.airlockBox ? CTL.airlock_box.lcd_on : CTL.airlock_box.lcd_off).replace('|', '\n'))}</div></div>
    </div></div>
    <div class="mstat">${['fan', 'blower', 'airlock'].map(m => `<span>${t4(CT.motors[m].name)}</span><span class="${motorStatus(m).cls === 'run' ? 'ok' : motorStatus(m).cls === 'lock' ? 'bad' : ''}">${t4(motorStatus(m).label)}</span>`).join('')}</div>
    ${['eaton_in_left', 'eaton_in_right'].map(lockLine).join('')}`;
    foot = `<div class="note">${t4(L4('Left switch: main fan. Right switch: blower and airlock.', 'Interruptor izquierdo: ventilador. Derecho: soplador y válvula rotativa.', 'Interrupteur gauche : ventilateur. Droit : soufflante et écluse.', 'Swichi ya kushoto: feni kuu. Ya kulia: kipuliza na vali.'))}</div>`;
  } else if (PANEL === 'outside') {
    title = U.p_outside;
    body = `<div class="pv"><div class="wall">${['eaton_out_fan', 'eaton_out_blower', 'eaton_out_airlock'].map(eatonHTML).join('')}</div></div>
      <div class="mstat">${['fan', 'blower', 'airlock'].map(m => `<span>${t4(CT.motors[m].name)}</span><span class="${motorStatus(m).cls === 'run' ? 'ok' : motorStatus(m).cls === 'lock' ? 'bad' : ''}">${t4(motorStatus(m).label)}</span>`).join('')}</div>
      ${['eaton_out_fan', 'eaton_out_blower', 'eaton_out_airlock'].map(lockLine).join('')}`;
    foot = `<div class="note">${t4(L4('One shut-off per motor. Each stops only its own motor.', 'Un corte por motor. Cada uno detiene solo su motor.', "Une coupure par moteur. Chacune n'arrête que son moteur.", 'Kizima kimoja kwa kila mota. Kila kimoja husimamisha mota yake tu.'))}</div>`;
  } else if (PANEL === 'gate_panel') {
    title = U.p_gates;
    const ang = S.air.on ? 40 : -120;
    body = `<div class="pv"><div class="gp"><div class="gauge"><i style="transform:rotate(${ang}deg)"></i></div><div class="plate">
      ${CTL.gate_panel.buttons.map(b => `<div><div class="nm">${esc(b.printed)}</div><button class="sq g ${S.gates[b.gate] ? 'lit' : ''}" data-gopen="${b.gate}"></button><button class="sq r ${S.gates[b.gate] ? '' : 'lit'}" data-gclose="${b.gate}"></button></div>`).join('')}
    </div></div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px;color:#111"><b>${esc(tx(U.air, L1))}:</b> ${esc(tx(S.air.on ? U.open : U.closed, L1))}
      <button class="minib" data-air="1">${esc(tx(S.air.on ? U.off : U.on, L1))}</button><button class="minib" data-lock="air_valve">${esc(tx(S.air.locked ? U.remove_lock : U.lock_tag, L1))}</button></div></div>
      ${lockLine('air_valve')}<div class="note">${t4(CTL.air_valve.name)} ${t4(U.approx)}</div>`;
    foot = `<div class="note">${t4(L4('Green opens the gate. Red closes it.', 'Verde abre la compuerta. Rojo la cierra.', 'Vert ouvre la vanne. Rouge la ferme.', 'Kijani hufungua vali. Nyekundu huifunga.'))}</div>`;
  } else if (PANEL === 'flamex_A' || PANEL === 'flamex_B') {
    const z = PANEL.slice(-1), Z = S.flamex[z], P = CT.flamex.panels[z], blink = true, lamp = Z.lamp > 0;
    const vId = P.valve, v = S.valve[vId], hId = P.detector_hatch, water = Z.spray > 0 && v.open;
    title = P.name;
    const led = (on, col, label, bl) => `<div class="led"><i class="${on ? col : ''}${on && bl && !lamp ? ' bl' : ''}"></i>${esc(label)}</div>`;
    const left = z === 'A'
      ? [led(Z.fire || lamp, 'r', 'Fire', true), led(lamp, 'y', 'Fault'), led(Z.key === 1 || lamp, 'y', 'Supervisory / Access on'), led((Z.fire && Z.by !== null) || lamp, 'r', 'Primary Zone Spark Detector'), led(lamp, 'y', 'Secondary Zone Spark Detector'), led(water || lamp, 'r', 'Valve Primary Zone Extinguishing Activated'), led(Z.horns || lamp, 'r', 'Alarm Horn Off/On')]
      : [led(Z.fire || lamp, 'r', 'Fire', true), led(lamp, 'y', 'Fault'), led((Z.fire) || lamp, 'r', 'Group 1 DET 10 inch Duct'), led(water || lamp, 'r', 'Group 5 FM 10 inch Duct'), led(water || lamp, 'r', 'Group 11 EXT 10 inch Duct'), led(Z.horns || lamp, 'r', 'Group 13 Alarm Horn')];
    const right = [led(true, 'gr', 'Operation'), led(lamp, 'y', 'System fault'), led(lamp, 'y', z === 'A' ? 'Mains Fault / Battery Fault' : 'Power Supply Fault'), led(Z.key === 1 || lamp, 'y', z === 'A' ? 'Test State' : 'Disabled'), led((Z.extOff && Z.fire) || lamp, 'y', 'Audible alarm off')];
    const ts = Z.msgT ? Z.msgT : null;
    const lcd = z === 'B' ? (Z.fire ? `1 Detect.group 1\nFire\n${ts ? ts.toTimeString().slice(0, 8) + ',' + String(ts.getMilliseconds()).padStart(3, '0') + ' ' + ts.toLocaleDateString('en-GB').replace(/\//g, '.').replace(/\.(\d\d)(\d\d)$/, '.$2') : ''}\nDET 10 inch Duct${water ? '\n5 Contr. group 11\nExt. sys. released' : ''}` : `FLAMEX INC.\n${new Date().toLocaleDateString('en-US')} ${new Date().toTimeString().slice(0, 5)}`) : '';
    body = `<div class="fx"><div style="font:700 11px Arial;margin-bottom:4px">${esc(P.printed_title)} · ${esc(P.model)}</div>
      ${z === 'B' ? `<div class="lcd g" style="margin:0 auto 8px;width:fit-content">${esc(lcd)}</div>` : ''}
      <div class="face"><div class="col">${left.join('')}</div>
      <div class="mid">
        <button class="fb" data-fx="int" title="Buzzer off">int</button><button class="fb red" data-fx="ext" title="External alarms off">ext</button>
        <button class="fb" data-fx="lamp" title="Lamp test">lamp</button><button class="fb red" data-fx="reset" title="Reset">Reset</button>
        <button class="fb" data-fx="firectl" title="Fire control off">fire ctl</button><button class="fb" data-fx="onoff" title="On/Off">on/off</button>
        <div class="key"><button class="${Z.key ? 'k1' : ''}" data-fx="key" title="Key 0 / 1"></button><small>key: ${Z.key} ${Z.key ? '(bypass)' : '(active)'}</small></div>
      </div>
      <div class="col">${right.join('')}</div></div></div>
      <div class="fxinfo">
        <span>${t4(U.water)}</span><span class="${water ? 'bad' : ''}"><b>${water ? esc(tx(U.spraying, L1)) : '-'}</b> <b id="sprayT"></b> <span class="note">(${CT.flamex.spray_time_s} s ${esc(tx(U.typical, L1))})</span></span>
        <span>${t4(U.valve)}</span><span>${esc(tx(v.open ? U.open : U.closed, L1))} <button class="minib" data-valve="${vId}">${esc(tx(v.open ? U.closed : U.open, L1))}</button> <button class="minib" data-lock="${vId}">${esc(tx(v.locked ? U.remove_lock : U.lock_tag, L1))}</button></span>
        <span>${t4(U.hatch)}</span><span>${esc(tx(S.hatch[hId].open ? U.open : U.closed, L1))} <button class="minib" data-hatch="${hId}">${esc(tx(U.open_hatch, L1))}</button></span>
        <span></span><span><button class="b" data-shine="${z}">🔦 ${b4(U.shine)}</button></span>
      </div>${lockLine(vId)}
      <div class="note">${t4(P.zone_where)}</div><div class="note">${t4(U.no_shutdown)}</div>`;
  }
  const html = `<div class="in"><div class="top"><h3>${t4(title)}</h3><button class="x" aria-label="Close">×</button></div>${body}${foot}<div class="note">${t4(U.sim_note)}</div></div>`;
  if (el._sig === html) return;
  el._sig = html; el.innerHTML = html;
  el.querySelector('.x').onclick = closePanel;
  const on = (sel, f) => el.querySelectorAll(sel).forEach(b => b.onclick = (e) => { f(b, e); renderAll(); });
  on('[data-eaton]', b => setEaton(b.dataset.eaton, !S.eaton[b.dataset.eaton].on));
  on('[data-lock]', b => { const id = b.dataset.lock, L = lockable(id); if (L.locked) removeLock(id); else if (!isOffForLock(id)) { say(MSG.lock_needs_off, 'bad'); result(id, 'lock', 'lock_needs_off'); } else lockDialog(id); });
  on('[data-start]', b => pressStarter(b.dataset.start, 'start'));
  on('[data-stop]', b => pressStarter(b.dataset.stop, 'stop'));
  on('[data-albox]', b => pressAirlockBox(b.dataset.albox));
  on('[data-gopen]', b => setGate(b.dataset.gopen, true));
  on('[data-gclose]', b => setGate(b.dataset.gclose, false));
  on('[data-air]', () => setAir(!S.air.on));
  on('[data-fx]', b => fxButton(PANEL.slice(-1), b.dataset.fx));
  on('[data-valve]', b => setValve(b.dataset.valve, !S.valve[b.dataset.valve].open));
  on('[data-hatch]', b => toggleHatch(b.dataset.hatch));
  on('[data-shine]', b => shine(b.dataset.shine));
}
function lockDialog(id) {
  const today = new Date().toISOString().slice(0, 10);
  let who = 'Trainee'; try { who = localStorage.getItem('dce_name') || who; } catch (e) { /* ignore */ }
  const proc = PROC ? tx(PROCDEF().title, 'en') : 'Maintenance';
  elModal.innerHTML = `<div class="card"><div class="stripe" style="background:#c62828"></div><div class="in"><h3>${t4(U.lock_tag)}</h3>
    <div class="note">${t4(CTL[id]?.name || { en: id })}</div>
    <div class="banner" style="background:#c62828;color:#fff;border-color:#c62828;font-weight:700">${t4(U.danger)}</div>
    <label>${t4(U.name)}<input id="lkN" value="${esc(who)}" maxlength="40"></label>
    <label>${t4(U.date)}<input id="lkD" value="${today}" maxlength="20"></label>
    <label>${t4(U.reason)}<input id="lkR" value="${esc(proc)}" maxlength="80"></label>
    <div class="acts"><button class="b go" id="lkOk">${b4(U.apply)}</button><button class="b" id="lkNo">${b4(U.cancel)}</button></div></div></div>`;
  elModal.style.display = 'flex';
  $('#lkNo').onclick = () => { elModal.style.display = 'none'; };
  $('#lkOk').onclick = () => {
    const tag = { name: $('#lkN').value.trim() || 'Trainee', date: $('#lkD').value.trim(), reason: $('#lkR').value.trim() };
    try { localStorage.setItem('dce_name', tag.name); } catch (e) { /* ignore */ }
    elModal.style.display = 'none'; applyLock(id, tag); renderAll();
  };
}

// ---------- procedure engine
let PROC = null; // {id, i, startT, events:[], mistakes, msg, done:[]}
const PROCDEF = () => PR.procedures.find(p => p.id === PROC.id);
function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S); }
function evalCond(c) {
  if (!c) return true;
  if (c.all) return c.all.every(evalCond);
  if (c.any) return c.any.some(evalCond);
  if (c.not) return !evalCond(c.not);
  if (c.eq) { const v = getPath(c.eq[0]); return v === c.eq[1]; }
  if (c.lt) return getPath(c.lt[0]) < c.lt[1];
  if (c.gt) return getPath(c.gt[0]) > c.gt[1];
  if (c.locked) return !!lockable(c.locked)?.locked;
  if (c.unlocked) return !lockable(c.unlocked)?.locked;
  if (c.event) return PROC.events.some(e => e.ctl === c.event.ctl && e.act === c.event.act && (!c.event.code || [].concat(c.event.code).includes(e.code)));
  return false;
}
function stateForProcPaths() { // expose a few derived values to the condition paths
  S.motor.fan.level = LV.fan; S.motor.blower.level = LV.blower; S.motor.airlock.level = LV.airlock;
  for (const [id, e] of Object.entries(S.eaton)) e.locked = !!e.locked;
}
function startProc(id) {
  storyStop();
  resetScene(true);
  PROC = { id, i: 0, events: [], mistakes: 0, msg: null, done: [], skipped: [] };
  enterStep();
}
function enterStep() {
  const P = PROCDEF(), st = P.steps[PROC.i];
  PROC.events = []; PROC.msg = null;
  if (!st) { renderProc(); return; }
  if (st.focus && CT.views[st.focus]) { const v = CT.views[st.focus]; flyTo({ position: v.position, target: v.target }, 1.2); applyViewVis(v); }
  else if (st.focus) { const vp = VPS.find(v => v.id === st.focus); if (vp) flyTo(vp.camera[vp.camera.length - 1], 1.2); }
  if (st.panel) openPanel(st.panel);
  if (st.tool === 'flashlight') { TOOL = 'flashlight'; document.body.classList.add('tool-on'); }
  highlightControls(st.highlight || []);
  LSRC.proc = (st.highlight || []).filter(id => CTL[id] || /^panel_/.test(id)).slice(0, 3).map(id => ({ key: 'p_' + id, text: CTL[id] ? CTL[id].name : CT.flamex.panels[id.slice(6)].name, a: { ctl: id }, accent: '#2563eb' }));
  refreshLabels();
  renderProc();
}
const hlGroup = new THREE.Group(); scene.add(hlGroup);
function highlightControls(ids) {
  hlGroup.clear();
  for (const id of ids) {
    let p = null;
    if (/^panel_/.test(id)) { const n = NODE[CT.flamex.panels[id.slice(6)].node]; if (n) p = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()); }
    else if (CTL[id]) { p = V3(CTL[id].pos); if (CTL[id].type === 'bucket' && S.bucket.placed) p = V3(CTL[id].placed_pos); }
    if (!p) continue;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 32), new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
    ring.position.copy(p); ring.renderOrder = 30; ring.userData.pulse = true; hlGroup.add(ring);
  }
}
function procOnEvent(ev) {
  if (!PROC) return;
  const P = PROCDEF(), st = P.steps[PROC.i]; if (!st) return;
  PROC.events.push(ev);
  const mk = (st.mistakes || []).find(m => m.event.ctl === ev.ctl && m.event.act === ev.act && (m.event.value === undefined || m.event.value === ev.value));
  if (mk) { PROC.mistakes++; PROC.msg = { kind: 'bad', o: mk.text }; renderProc(); return; }
  if (!ev.ok && ev.code !== 'locked_out' && ev.code !== 'no_power') { PROC.msg = { kind: 'bad', o: MSG[ev.code] || U.check_failed }; renderProc(); }
  else if (!ev.ok && st.cond && JSON.stringify(st.cond).includes('"start"')) { /* expected during the verify step */ }
  checkStep();
}
listeners.push(procOnEvent);
function checkStep(fromAck = false) {
  if (!PROC) return;
  const P = PROCDEF(), st = P.steps[PROC.i]; if (!st) return;
  stateForProcPaths();
  if (st.ack && !fromAck) return;
  if (st.ack && st.check && !evalCond(st.check)) { PROC.msg = { kind: 'bad', o: U.check_failed }; PROC.mistakes++; renderProc(); return; }
  if (!st.ack && !evalCond(st.cond)) return;
  PROC.done.push(st.id); PROC.i++;
  if (TOOL && st.tool) { TOOL = null; document.body.classList.remove('tool-on'); }
  setTimeout(() => { if (PROC) { enterStep(); toast(U.good, 'ok'); } }, 250);
}
function renderProc() {
  let el = $('#proc');
  if (!PROC) { if (el) el.remove(); if (!ST) hlGroup.clear(); if (LSRC.proc.length) { LSRC.proc = []; refreshLabels(); } return; }
  if (!el) { el = document.createElement('div'); el.id = 'proc'; el.className = 'card'; elRight.prepend(el); }
  const P = PROCDEF(), st = P.steps[PROC.i], n = P.steps.length;
  let partLabel = null; for (let k = 0; k <= Math.min(PROC.i, n - 1); k++) if (P.steps[k].part) partLabel = P.steps[k].part;
  let html = `<div class="stripe" style="background:${P.kind === 'loto' ? '#c62828' : '#78e6ff'}"></div><div class="in"><div class="top"><h3>${t4(P.title)}</h3><button class="x" aria-label="${esc(U.exit.en)}">×</button></div>`;
  if (P.template) html += `<div class="banner">${t4(P.template)}</div>`;
  if (P.source) html += `<div class="note">${t4(P.source)}</div>`;
  html += `<div class="prog"><div style="width:${100 * PROC.i / n}%"></div></div>`;
  if (!st) {
    html += `<div class="good">${t4(U.finished)} ${t4(U.mistakes)}: <b>${PROC.mistakes}</b></div><div class="acts"><button class="b" id="prRe">${b4(U.restart)}</button><button class="b" id="prX">${b4(U.exit)}</button></div>`;
  } else {
    if (partLabel) html += `<div class="note"><b>${t4(partLabel)}</b></div>`;
    html += `<div style="margin:4px 0 2px">${st.actor ? `<span class="actor">${esc(tx(U.employee, LANG === 'all' ? 'en' : LANG))} ${esc(st.actor)}</span> ` : ''}<span class="note">${esc(tx(U.step, LANG === 'all' ? 'en' : LANG))} ${PROC.i + 1} / ${n}</span></div>`;
    html += `<div style="font-size:15px">${t4(st.text)}</div>`;
    if (st.show === 'energy' && P.energy_sources) {
      html += `<div class="note" style="margin-top:6px"><b>${t4(U.energy)}</b></div><ul class="energy">${P.energy_sources.map(e => `<li><b>${esc(e.type)}</b>: ${t4(e.what)}${e.isolation.length ? ` → ${e.isolation.map(i => esc(tx(CTL[i]?.name, 'en'))).join(', ')}` : ''}${e.upstream ? ` <span class="note">(upstream: ${e.upstream.map(i => esc(tx(CTL[i]?.name, 'en'))).join(', ')})</span>` : ''}${e.note ? `<div class="note">${t4(e.note)}</div>` : ''}</li>`).join('')}</ul>`;
    }
    if (st.tool === 'flashlight') html += `<div class="note">🔦 ${t4(MSG.pick_flashlight)}</div>`;
    if (PROC.msg) html += `<div class="${PROC.msg.kind === 'bad' ? 'mist' : 'good'}">${t4(PROC.msg.o)}</div>`;
    html += `<div class="acts">${st.ack ? `<button class="b go" id="prAck">${b4(U.done)}</button>` : ''}${st.optional ? `<button class="b" id="prSkip">${b4(U.skip)}</button>` : ''}${st.tool === 'flashlight' ? `<button class="b" id="prTool">🔦 ${b4(U.flash_tool)}</button>` : ''}<button class="b" id="prX">${b4(U.exit)}</button></div>`;
    html += `<div class="note">${t4(U.mistakes)}: ${PROC.mistakes}</div>`;
  }
  html += `<ol class="steps">${P.steps.map((s, k) => `<li class="${k < PROC.i ? 'done' : ''}">${esc(tx(s.text, LANG === 'all' ? 'en' : LANG)).slice(0, 70)}</li>`).join('')}</ol></div>`;
  el.innerHTML = html;
  const q = (s) => el.querySelector(s);
  q('.x').onclick = () => { PROC = null; TOOL = null; document.body.classList.remove('tool-on'); renderProc(); renderSide(); };
  if (q('#prX')) q('#prX').onclick = q('.x').onclick;
  if (q('#prRe')) q('#prRe').onclick = () => startProc(PROC.id);
  if (q('#prAck')) q('#prAck').onclick = () => checkStep(true);
  if (q('#prSkip')) q('#prSkip').onclick = () => { PROC.skipped.push(st.id); PROC.i++; enterStep(); };
  if (q('#prTool')) q('#prTool').onclick = () => { TOOL = 'flashlight'; document.body.classList.add('tool-on'); toast(MSG.pick_flashlight); };
  const li = el.querySelector('.steps li:not(.done)'); if (li) li.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- guided story: 6 steps, each a few short parts that play on their own
// Wording checked against LAYOUT_SPEC.md (sections 2-3), MANUAL_FACTS.md (1.5, 1.6, 3.1, 3.2) and FLAMEX_FACTS.md (sections 2, 4).
const HEX = { dust: '#f08a24', chips: '#9a6b3c', air: '#d9b100', clean: '#3b82f6', fine: '#7d8590', loop: '#12a594', fx: '#e0453a', ctl: '#2563eb' };
const STORY = TOUR.steps; // tour.json: the guided tour, edited as data
const SHUT = TOUR.shutdown;
const TU = TOUR.ui;
let ST = null; // { i, k, t, paused, fired, endT }  i === STORY.length = the shut-down sequence
const curStep = () => (!ST ? null : ST.i >= STORY.length ? SHUT : STORY[ST.i]);
let ST_ZONES0 = false;
let CAPO = null, STCAP = null; // free caption (viewpoints, demo) and the story part's caption
function endDemo() {
  if (!DEMO) return;
  for (const z of ['A', 'B']) Object.assign(S.flamex[z], { fire: false, buzzer: false, horns: false, extOff: false, spray: 0, cause: 0, by: null });
  DEMO = null; CAPO = null; elFoot.style.display = 'none';
}
function tourState(name, soft) { // set the simulator to one of tour.json's states (instantly: motors at speed, gates placed)
  const st = TOUR.states[name]; if (!st) return;
  if (soft && SM.hasState(st)) return;
  if (DEMO) endDemo();
  SM.applyState(st);
  if (st.instant !== false) { initFlow(true); for (const g of Object.keys(gateLv)) if (GATES[g]) { GATES[g].f = gateLv[g]; placeGate(GATES[g]); } }
  for (const id of Object.keys(CTL3)) buildLockVisual(id);
}
function tourAct(a) { SM.act(a, TOUR.states); renderAll(); }
function storyStart(i, k = 0) {
  if (PROC) { PROC = null; TOOL = null; document.body.classList.remove('tool-on'); renderProc(); }
  if (!ST) ST_ZONES0 = !!TOG.zones;
  STOP = -1; LSRC.view = []; CAPO = null;
  ST = { i: clamp(i, 0, STORY.length), k: -1, t: 0, paused: false, fired: new Set(), endT: null };
  storyPhase(k);
}
function storyPhase(k) {
  const step = curStep(), ph = step.phases[clamp(k, 0, step.phases.length - 1)];
  ST.k = step.phases.indexOf(ph); ST.t = 0; ST.paused = false; ST.fired = new Set(); ST.endT = null;
  if (DEMO && !ph.demo) endDemo();
  if (ph.state) tourState(ph.state, ph.state_soft);
  TOG.shed_walls = TOG.shed_roof = TOG.shop_wall = true;
  TOG.zones = ph.zones ? true : ST_ZONES0;
  applyScene(ph.vp);
  const vw = ph.view ? CT.views[ph.view] : null;
  if (vw) applyViewVis(vw);
  if (ph.demo === 'start') { TOG.follow = true; startDemo(); }
  else if (ph.cam === 'none' || ph.demo) { /* the demo flies the camera */ }
  else if (vw) flyTo({ position: vw.position, target: vw.target });
  else if (ph.cam && ph.cam.position) flyTo(ph.cam);
  else { const v = VPS.find(x => x.id === (ph.cam && ph.cam.vp ? ph.cam.vp : ph.vp)); if (v) playKeys((ph.cam && ph.cam.keys ? ph.cam.keys : v.camera.map((_, j) => j)).map(j => v.camera[j])); }
  LSRC.story = (ph.labels || []).map((l, j) => ({ key: `s${ST.i}_${ST.k}_${j}`, text: l.text, a: l.a, accent: HEX[l.accent] || l.accent }));
  LSRC.max = 3; refreshLabels(); zoneLabels();
  highlightStory(ph.hl || []);
  highlightControls([]); // the labels point at the controls; no rings over them
  if (ph.panel) openPanel(ph.panel); else if (PANEL && !PROC) closePanel();
  STCAP = ph.cap || null;
  renderCaption(); renderSide(); updateFlow();
}
function untilOk(u) { if (!u) return true; const v = getPath(u.path); return 'eq' in u ? v === u.eq : !!v; }
function stepStory(dt) {
  if (!ST) return;
  const step = curStep(), ph = step.phases[ST.k];
  ST.t += dt;
  (ph.at || []).forEach(([t, a], j) => { if (ST.t >= t && !ST.fired.has(j)) { ST.fired.add(j); tourAct(a); } });
  if (ST.paused) return;
  const done = ST.t >= (ph.dur || 5) && (untilOk(ph.until) || ST.t > 60);
  if (!done) return;
  if (ST.k < step.phases.length - 1) { storyPhase(ST.k + 1); return; }
  if (ph.end) return; // end card: Replay / Shut down
  if (ST.endT == null) ST.endT = ST.t;
  if (ST.t - ST.endT > 1.2) storyStart(ST.i + 1); // played straight through: on to the next step
}
function storyNext() { if (!ST) { storyStart(0); return; } storyStart(ST.i >= STORY.length ? 0 : ST.i + 1); }
function storyPrev() { if (!ST) return; if (ST.k > 0) storyPhase(ST.k - 1); else storyStart(ST.i >= STORY.length ? STORY.length - 1 : Math.max(0, ST.i - 1)); }
function storyStop() {
  if (!ST) return;
  ST = null; STCAP = null; LSRC.story = []; TOG.zones = ST_ZONES0; refreshLabels(); zoneLabels(); highlightStory([]); hlGroup.clear();
  if (DEMO) endDemo();
  renderCaption(); renderSide(); updateFlow();
}
window.addEventListener('keydown', e => { // keyboard: right arrow / Space next, left arrow back, Esc exit (the arrows walk in walk mode)
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.altKey || e.metaKey) return;
  const walk = MODE === 'walk';
  if (e.code === 'Space' || e.code === 'PageDown' || (!walk && e.code === 'ArrowRight')) { e.preventDefault(); if (e.shiftKey && e.code === 'Space') storyPrev(); else storyNext(); }
  else if (e.code === 'PageUp' || (!walk && e.code === 'ArrowLeft')) { if (ST) { e.preventDefault(); storyPrev(); } }
  else if (e.code === 'Escape' && ST) storyStop();
});
function setCaption(o) { CAPO = o; renderCaption(); }
function renderCaption() {
  const L1 = LANG === 'all' ? 'en' : LANG;
  let html;
  if (ST) {
    const step = curStep(), ph = step.phases[ST.k];
    const cap = STCAP || (DEMO && CAPO);
    const caps = !cap ? '' : (Array.isArray(cap) ? cap : [cap]).map(c => `<div class="sb-cap">${t4(c)}</div>`).join('');
    const n = ST.i >= STORY.length ? '' : `<span class="sb-n">${ST.i + 1} / ${STORY.length}</span>`;
    const atEnd = ph.end && ST.k === step.phases.length - 1;
    html = `<div class="sb-top"><button class="sb-nav" data-sb="prev" aria-label="${esc(tx(U.back, L1))}">‹</button>
      <div class="sb-title">${n}<span>${b4(step.title)}</span></div>
      <button class="sb-nav" data-sb="next" aria-label="${esc(tx(U.next, L1))}">›</button><button class="sb-x" data-sb="x" aria-label="${esc(tx(U.exit, L1))}">×</button></div>
      ${caps}
      <div class="sb-dots">${step.phases.length > 1 ? step.phases.map((p, j) => `<button class="${j === ST.k ? 'on' : j < ST.k ? 'done' : ''}" data-sbp="${j}" aria-label="${j + 1}"></button>`).join('') : ''}
        ${ST.paused && !atEnd ? `<button class="sb-re" data-sb="re">↻ ${esc(tx(TU.replay, L1))}</button>` : ''}</div>
      ${atEnd ? `<div class="sb-end"><button class="b sb-big" data-sb="replay">↻ ${b4(TU.replay)}</button>${ST.i < STORY.length ? `<button class="b sb-big sb-act" data-sb="shut">■ ${b4(TU.shutdown)}</button>` : ''}</div>` : ''}
      <div class="sb-keys">${esc(tx(TU.keys, L1))}</div>`;
    elCap.className = 'story';
  } else if (CAPO) { html = t4(CAPO); elCap.className = ''; }
  else { html = `<button class="sb-start" data-sb="start">▶ ${b4(U.tour)} <span class="sb-n">${STORY.length}</span></button>`; elCap.className = 'idle'; }
  if (elCap._h === html) return;
  elCap._h = html; elCap.innerHTML = html; elCap.style.display = MODE === 'walk' && !ST ? 'none' : 'block'; fitRight();
  elCap.querySelectorAll('[data-sb]').forEach(b => b.onclick = () => {
    const a = b.dataset.sb;
    if (a === 'start' || a === 'replay') storyStart(0);
    else if (a === 'x') storyStop();
    else if (a === 'next') storyNext();
    else if (a === 'prev') storyPrev();
    else if (a === 're') storyPhase(ST.k);
    else if (a === 'shut') storyStart(STORY.length);
  });
  elCap.querySelectorAll('[data-sbp]').forEach(b => b.onclick = () => storyPhase(+b.dataset.sbp));
}

// ---------------------------------------------------------------- flow map (side panel): the three air systems, where they meet, what they carry
const ZCOL = { suction: ZONES.suction.hex, push: ZONES.push.hex, loop: ZONES.loop.hex };
const FMZ = [
  { id: 'suction', name: L4('Suction', 'Succión', 'Aspiration', 'Kuvuta'), pay: L4('Air + sawdust + PVC chips', 'Aire + aserrín + virutas de PVC', 'Air + sciure + copeaux de PVC', 'Hewa + vumbi la mbao + vipande vya PVC'), icon: 'mix' },
  { id: 'push', name: L4('Push', 'Empuje', 'Soufflage', 'Kusukuma'), pay: L4('Air + fine dust, then clean air', 'Aire + polvo fino, luego aire limpio', 'Air + poussière fine, puis air propre', 'Hewa + vumbi laini, kisha hewa safi'), icon: 'fine' },
  { id: 'loop', name: L4('Chip loop', 'Circuito de virutas', 'Boucle à copeaux', 'Mzunguko wa vipande'), pay: L4('Chips out; the same air comes back', 'Virutas afuera; el mismo aire regresa', "Copeaux dehors ; le même air revient", 'Vipande nje; hewa ileile inarudi'), icon: 'chips' }
];
const FMB = [ // boxes: x, y, w, h in the 300 x 216 drawing; go = where a tap flies
  { id: 'machines', x: 3, y: 90, w: 44, h: 24, z: 'suction', name: L4('Machines', 'Máquinas', 'Machines', 'Mashine'), go: { vp: 'machines', keys: [0, 1], part: 'machine', node: 'CNC1_Gantry' } },
  { id: 'gates', x: 55, y: 90, w: 46, h: 24, z: 'suction', name: L4('Blast gates', 'Compuertas', 'Vannes', 'Vali'), go: { view: 'gate_panel', vp: 'machines', panel: 'gate_panel' } },
  { id: 'duct', x: 109, y: 90, w: 33, h: 24, z: 'suction', name: L4('Duct', 'Ducto', 'Gaine', 'Bomba'), go: { vp: 'wall', part: 'inlet', node: 'DC_InletDuct' } },
  { id: 'cyclone', x: 150, y: 84, w: 48, h: 36, z: 'suction', name: L4('Cyclone', 'Ciclón', 'Cyclone', 'Kimbunga'), go: { vp: 'cyclone', part: 'cyclone', node: 'Cyc__barrel' } },
  { id: 'fan', x: 150, y: 47, w: 48, h: 24, meet: true, name: L4('Main fan', 'Ventilador', 'Ventilateur', 'Feni kuu'), go: { vp: 'fan', part: 'fan', node: 'Fan__scroll' } },
  { id: 'filters', x: 212, y: 47, w: 46, h: 24, z: 'push', name: L4('Filters', 'Filtros', 'Filtres', 'Vichujio'), go: { vp: 'filters', keys: [0, 1], part: 'filters', node: 'FL__plenum' } },
  { id: 'clean', x: 204, y: 6, w: 62, h: 20, z: 'push', pill: true, name: L4('Clean air out', 'Aire limpio', 'Air propre', 'Hewa safi'), go: { vp: 'filters', keys: [0, 1], part: 'filters', node: 'FL__cart1' } },
  { id: 'drum', x: 216, y: 81, w: 38, h: 20, z: 'push', name: L4('Drum', 'Tambor', 'Fût', 'Pipa'), go: { vp: 'filters', keys: [2, 3], part: 'drum', node: 'FL__drum' } },
  { id: 'airlock', x: 150, y: 136, w: 48, h: 24, meet: true, name: L4('Airlock', 'Válvula', 'Écluse', 'Vali'), go: { vp: 'airlock', part: 'airlock', node: 'AL__body' } },
  { id: 'blower', x: 206, y: 164, w: 44, h: 24, z: 'loop', name: L4('Blower', 'Soplador', 'Soufflante', 'Kipuliza'), go: { vp: 'blower', keys: [0, 1, 2], part: 'blower', node: 'BL__housing' } },
  { id: 'rolloff', x: 258, y: 164, w: 40, h: 24, z: 'loop', name: L4('Roll-off', 'Contenedor', 'Benne', 'Kontena'), go: { vp: 'back', part: 'rolloff', node: 'DC_Compactor' } }
];
// arrows: path, payload color, which system drives it (s = main fan, l = transfer blower)
const FMA = [
  ['M47 102H55', HEX.dust, 's'], ['M101 102H109', HEX.dust, 's'], ['M142 102H150', HEX.dust, 's'],
  ['M174 84V71', HEX.air, 's'], ['M198 59H212', HEX.air, 's'], ['M235 47V26', HEX.clean, 's'], ['M235 71V81', HEX.fine, 's'],
  ['M174 120V136', HEX.chips, 's'], ['M174 160V176H206', HEX.chips, 'l'], ['M250 176H258', HEX.chips, 'l'],
  ['M278 188V203H182V180', HEX.loop, 'l', true]
];
function fmText(b, L1) {
  const t = tx(b.name, L1), fs = 9.4, est = t.length * fs * 0.56, fit = est > b.w - 6 ? ` textLength="${b.w - 6}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 3}" font-size="${fs}"${fit}>${esc(t)}</text>`;
}
function renderFlow() {
  const el = $('#flowCard'); if (!el) return;
  const L1 = LANG === 'all' ? 'en' : LANG;
  const zn = (id) => esc(tx(FMZ.find(z => z.id === id).name, L1)).toUpperCase();
  const svg = `<svg class="fm" id="fmSvg" viewBox="0 0 300 216" role="img" aria-label="${esc(tx(U.flowmap, L1))}">
    <defs>${[...new Set(FMA.map(a => a[1]))].map(c => `<marker id="ah${c.slice(1)}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" fill="${c}"/></marker>`).join('')}</defs>
    <rect class="zt" x="1" y="64" width="202" height="84" rx="9" fill="${ZCOL.suction}"/>
    <path class="zt" d="M146 1H299V104H206V62H146Z" fill="${ZCOL.push}"/>
    <rect class="zt" x="146" y="150" width="153" height="65" rx="9" fill="${ZCOL.loop}"/>
    <text class="zn" x="7" y="143" fill="${ZCOL.suction}">${zn('suction')}</text>
    <text class="zn" x="294" y="98" text-anchor="end" fill="${ZCOL.push}">${zn('push')}</text>
    <text class="zn" x="152" y="212" fill="${ZCOL.loop}">${zn('loop')}</text>
    ${FMA.map(([d, c, drv, dash]) => `<path class="fa ${drv}${dash ? ' ret' : ''}" d="${d}" stroke="${c}" marker-end="url(#ah${c.slice(1)})"/>`).join('')}
    ${FMB.map(b => `<g class="fb${b.meet ? ' meet' : ''}" data-fm="${b.id}" tabindex="0" role="button" aria-label="${esc(tx(b.name, L1))}">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.pill ? b.h / 2 : 6}" stroke="${b.meet ? '#e0a800' : ZCOL[b.z]}"/>${fmText(b, L1)}</g>`).join('')}
  </svg>`;
  const icon = (k, c) => k === 'mix' ? `<svg viewBox="0 0 22 12"><circle cx="4" cy="6" r="2.2" fill="${HEX.dust}"/><circle cx="11" cy="4" r="1.6" fill="${HEX.chips}"/><rect x="15" y="5" width="4" height="3" rx="1" fill="#e9e1c3" stroke="#b9ab7a" stroke-width=".6"/></svg>`
    : k === 'fine' ? `<svg viewBox="0 0 22 12"><circle cx="3" cy="6" r="1.2" fill="${HEX.fine}"/><circle cx="7" cy="4" r="1" fill="${HEX.fine}"/><path d="M11 6H20" stroke="${HEX.clean}" stroke-width="1.8" marker-end="url(#ah${HEX.clean.slice(1)})"/></svg>`
    : `<svg viewBox="0 0 22 12"><rect x="2" y="4" width="4" height="3" rx="1" fill="${HEX.chips}"/><rect x="8" y="6" width="3.5" height="3" rx="1" fill="${HEX.chips}"/><path d="M14 9a4 4 0 1 0 0-6" fill="none" stroke="${HEX.loop}" stroke-width="1.4"/></svg>`;
  el.innerHTML = `<div class="fm-hd">${b4(U.flowmap)}</div>${svg}
    <div class="fm-leg">${FMZ.map(z => `<div class="fz" data-fz="${z.id}"><i style="background:${ZCOL[z.id]}"></i><span class="ic">${icon(z.icon)}</span><div>${t4(L4(...LANGS.map(l => tx(z.name, l) + ': ' + tx(z.pay, l))))}</div></div>`).join('')}
      <div class="fz meet"><i></i><span class="ic"></span><div>${t4(U.meet)}</div></div></div>
    <label class="tog"><input type="checkbox" data-ftog="zones" ${TOG.zones ? 'checked' : ''}><span>${b4(U.zones)}</span></label>
    <div class="note">${t4(U.tap_map)}</div>`;
  el.querySelectorAll('[data-fm]').forEach(g => { g.onclick = () => goFlow(g.dataset.fm); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goFlow(g.dataset.fm); } }; });
  el.querySelector('[data-ftog]').onchange = e => { TOG.zones = e.target.checked; zoneLabels(); updateFlow(); };
  FLOWSIG = ''; updateFlow();
}
let FLOWSIG = '';
function zoneLabels() { // with the zones on, the 3D view names them (same colors as the map)
  const at = { suction: 'wall.gap', push: { node: 'FL__plenum' }, loop: 'blower.riser' };
  LSRC.zone = TOG.zones ? FMZ.map(z => ({ key: 'zone_' + z.id, text: z.name, a: at[z.id], accent: ZCOL[z.id] })) : [];
  refreshLabels();
}
function updateFlow() { // live state: arrows move only while their system runs; the story step's boxes glow
  const svg = $('#fmSvg'); if (!svg) return;
  const runS = LV.fan > 0.3 && anyGate(), runL = LV.blower > 0.3;
  const hot = ST ? (curStep().map || []) : [], fz = ST ? curStep().zone : null;
  const sig = [runS, runL, hot.join(), fz, TOG.zones].join('|');
  if (sig === FLOWSIG) return; FLOWSIG = sig;
  svg.classList.toggle('run-s', runS); svg.classList.toggle('run-l', runL);
  svg.querySelectorAll('[data-fm]').forEach(g => g.classList.toggle('hot', hot.includes(g.dataset.fm)));
  document.querySelectorAll('#flowCard .fz[data-fz]').forEach(r => r.classList.toggle('hot', TOG.zones || r.dataset.fz === fz));
  const cb = $('#flowCard [data-ftog]'); if (cb) cb.checked = !!TOG.zones;
}
function goFlow(id) { // tap a box: fly there, open it up, and show its card
  const b = FMB.find(x => x.id === id); if (!b) return;
  const g = b.go;
  storyStop();
  STOP = -1;
  if (g.view) {
    applyScene(g.vp); TOG.shed_walls = TOG.shed_roof = TOG.shop_wall = true;
    const v = CT.views[g.view]; applyViewVis(v); flyTo({ position: v.position, target: v.target });
    LSRC.view = [{ key: 'fm_' + id, text: b.name, a: { ctl: 'gate_panel' }, accent: '#d8b51a' }]; refreshLabels();
    setCaption(null);
  } else {
    const i = VPS.findIndex(v => v.id === g.vp);
    STOP = i; applyScene(g.vp); setCaption(null);
    const v = VPS[i]; playKeys((g.keys || v.camera.map((_, j) => j)).map(j => v.camera[j]));
    LSRC.view = []; refreshLabels();
  }
  if (g.panel) openPanel(g.panel);
  if (g.part) { const p = PARTS.find(x => x.id === g.part); if (p) selectPart(p, g.node); }
  renderSide(); updateFlow();
}

// ---------- side panel
let MOREOPEN = false;
function renderSide() {
  if (!elSide._init) { elSide.innerHTML = '<div id="sideTop"></div><div id="flowCard" class="fm-card"></div><div id="sideMain"></div>'; elSide._init = true; renderFlow(); }
  const cutBtns = ['cyclone', 'fan', 'airlock', 'transfer_blower', 'filter_cartridge', 'drum', 'ducts'].map(k => `<button class="b ${CUT[k].open ? 'on' : ''}" data-cut="${k}">${b4(k === 'ducts' ? U.ducts : CUT[k].text)}</button>`).join('');
  const sysOn = S.motor.fan.running || S.motor.blower.running || S.motor.airlock.running;
  $('#sideTop').innerHTML = `<h1>Dust Collection Explorer</h1><div class="sub">${t4(U.sub)}</div>
    <div class="langs">${['all', ...LANGS].map(l => `<button data-lang="${l}" class="${LANG === l ? 'on' : ''}">${l === 'all' ? esc(U.all.en) : l.toUpperCase()}</button>`).join('')}</div>`;
  $('#sideMain').innerHTML = `
    <div class="sec"><div class="hd">${b4(U.tour)}</div>
      <div class="tour">${STORY.map((st, i) => `<button class="b ${ST && ST.i === i ? 'on' : ''}" data-story="${i}"><span class="n">${i + 1}</span><span>${b4(st.title)}</span></button>`).join('')}</div></div>
    <div class="sec"><div class="hd">${b4(U.system)}</div>
      <div class="switch"><button class="b big ${sysOn ? 'go' : ''}" id="sysOn">${b4(U.on)}</button><button class="b big ${!sysOn ? 'stop' : ''}" id="sysOff">${b4(U.off)}</button></div>
      <div class="row" style="margin-top:6px"><button class="b wide" id="rst">${b4(U.reset_scene)}</button></div></div>
    <div class="sec"><div class="hd">${b4(U.view)}</div>
      <div class="switch"><button class="b ${MODE === 'orbit' ? 'on' : ''}" data-mode="orbit">${b4(U.orbit)}</button><button class="b ${MODE === 'walk' ? 'on' : ''}" data-mode="walk">${b4(U.walk)}</button></div>
      <div class="note">${t4(U.drag_hint)}</div></div>
    <div class="sec"><div class="hd">${b4(U.show)}</div>
      ${['xray', 'shed_walls', 'shed_roof', 'shop_wall', 'shop_roof', 'labels', 'sound'].map(k => `<label class="tog"><input type="checkbox" data-tog="${k}" ${TOG[k] ? 'checked' : ''}><span>${b4(U[k])}</span></label>`).join('')}</div>
    <div class="sec"><div class="hd">${b4(U.sections)}</div><div class="row">${cutBtns}<button class="b ${EXPL.target ? 'on' : ''}" id="expl">${b4(U.exploded)}</button><button class="b" id="cutAll">${b4(U.close_all)}</button></div></div>
    <div class="sec"><div class="hd">${b4(U.flamex)}</div><button class="b wide ${DEMO ? 'on' : ''}" id="demo">${b4(U.flamex_run)}</button>
      <label class="tog"><input type="checkbox" data-tog="follow" ${TOG.follow ? 'checked' : ''}><span>${b4(U.follow)}</span></label>
      <div class="note">${t4(CT.flamex.spray_note)}</div></div>
    <div class="sec"><div class="hd">${b4(U.training)}</div><div class="tour">
      <button class="b" data-panel="collector" data-view="collector_wall">${b4(U.p_collector)}</button>
      <button class="b" data-panel="outside" data-view="outside_switches">${b4(U.p_outside)}</button>
      <button class="b" data-panel="gate_panel" data-view="gate_panel">${b4(U.p_gates)}</button>
      <button class="b" data-panel="flamex_A" data-view="flamex_panels">${b4(U.p_fxA)}</button>
      <button class="b" data-panel="flamex_B" data-view="flamex_panels">${b4(U.p_fxB)}</button></div></div>
    <div class="sec"><div class="hd">${b4(U.procedures)}</div><div class="tour">
      ${PR.procedures.map(p => `<button class="b ${PROC && PROC.id === p.id ? 'on' : ''}" data-proc="${p.id}">${b4(p.title)}</button>`).join('')}</div></div>
    <details class="sec more" ${MOREOPEN ? 'open' : ''}><summary class="hd">${b4(U.more_views)}</summary>
      <div class="tour">${VPS.map((v, i) => `<button class="b ${i === STOP ? 'on' : ''}" data-stop="${i}"><span class="n">${v.index}</span><span>${b4(v.title)}</span></button>`).join('')}</div></details>`;
  const on = (sel, f) => elSide.querySelectorAll(sel).forEach(b => b.onclick = (e) => f(b, e));
  on('[data-lang]', b => {
    LANG = b.dataset.lang; try { localStorage.setItem('dce_lang', LANG); } catch (e) { /* ignore */ }
    hudKey = ''; elCap._h = ''; renderAll(); renderFlow(); refreshLabels(); renderCaption();
  });
  on('[data-story]', b => storyStart(+b.dataset.story));
  on('#sysOn', () => systemOn());
  on('#sysOff', () => systemOff());
  on('#rst', () => resetScene());
  on('[data-mode]', b => setMode(b.dataset.mode));
  on('[data-stop]', b => applyStop(+b.dataset.stop));
  const det = elSide.querySelector('details.more'); if (det) det.ontoggle = () => { MOREOPEN = det.open; };
  elSide.querySelectorAll('[data-tog]').forEach(i => i.onchange = () => {
    const k = i.dataset.tog; TOG[k] = i.checked;
    if (k === 'xray') setXray(i.checked);
    if (groupNodes[k]) { tourOverride.add(k); applyVisibility(); }
    if (k === 'sound' && i.checked) ac();
  });
  on('[data-cut]', b => { const k = b.dataset.cut; setCutOpen(k, !CUT[k].open); if (CUT[k].open && k !== 'ducts') { TOG.shed_walls = false; TOG.shed_roof = false; applyVisibility(); const vp = { cyclone: 'cyclone', fan: 'fan', airlock: 'airlock', transfer_blower: 'blower', filter_cartridge: 'filters', drum: 'filters' }[k]; const v = VPS.find(x => x.id === vp); if (v) flyTo(v.camera[v.id === 'filters' && k === 'drum' ? 3 : 0], 1.2); } renderSide(); });
  on('#expl', () => { EXPL.target = EXPL.target ? 0 : 1; if (EXPL.target) { TOG.shed_walls = false; TOG.shed_roof = false; applyVisibility(); const v = VPS.find(x => x.id === 'exploded'); flyTo(v.camera[0], 1.2); } renderSide(); });
  on('#cutAll', () => { for (const k of Object.keys(CUT)) setCutOpen(k, false, true); EXPL.target = 0; renderSide(); });
  on('#demo', () => { storyStop(); startDemo(); });
  on('[data-panel]', b => { storyStop(); openPanel(b.dataset.panel); const v = CT.views[b.dataset.view]; if (v) { flyTo({ position: v.position, target: v.target }, 1.2); applyViewVis(v); } });
  on('[data-proc]', b => startProc(b.dataset.proc));
}
function renderAll() { renderSide(); renderInfo(); renderPanel(); renderProc(); renderHud(); }

// ---------------------------------------------------------------- system on/off and reset
function resetScene(quiet = false) {
  DEMO = null; setCaption(null); elFoot.style.display = 'none';
  Object.assign(S, freshState());
  for (const id of Object.keys(CTL3)) buildLockVisual(id);
  for (const d of Object.values(CT.motors)) S.starter[d.starter] = true;
  for (const g of SC.presets.system_on_like_video.gates_open) S.gates[g] = true;
  updateMotors();
  for (const m of Object.keys(LV)) LV[m] = 1;
  for (const g of Object.keys(gateLv)) gateLv[g] = S.gates[g] ? 1 : 0;
  initFlow(true);
  for (const k of Object.keys(CUT)) setCutOpen(k, false);
  EXPL.target = 0;
  if (!quiet) { PROC = null; }
  TOOL = null; document.body.classList.remove('tool-on');
  renderAll();
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, FPS = 60, uiAcc = 0;
function resize() {
  const w = elStage.clientWidth, h = elStage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  pMat.uniforms.uVP.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
window.addEventListener('resize', resize);
function tick(dt) {
  SIM.t += dt;
  SM.stepLevels(dt);
  for (const g of Object.keys(gateLv)) {
    if (GATES[g] && Math.abs(GATES[g].f - gateLv[g]) > 1e-4) { GATES[g].f = gateLv[g]; placeGate(GATES[g]); }
  }
  for (const R of ROT) {
    if (!R.node) continue;
    const m = motorOfRot[R.node.name]; const lev = smooth(clamp(LV[m] ?? 0, 0, 1)); // eased spin-up and coast-down
    R.angle += R.direction * 2 * Math.PI * (R.display_rpm / 60) * lev * dt;
    R.node.quaternion.copy(R.base).multiply(new THREE.Quaternion().setFromAxisAngle(R.axis, R.angle));
  }
  stepCuts(dt);
  if (EXPL.e !== EXPL.target) {
    EXPL.e = EXPL.e < EXPL.target ? Math.min(1, EXPL.e + dt / 1.3) : Math.max(0, EXPL.e - dt / 1.0);
    const e = smooth(EXPL.e);
    for (const g of EXPL.groups) for (const n of g.nodes) n.n.position.y = n.y + g.off * e;
  }
  stepFlamex(dt);
  stepDemo(dt);
  stepStory(dt);
  stepFlow(dt);
  stepPockets(Math.abs(ROT.find(r => r.node && r.node.name === 'Rig_AirlockRotor')?.angle || 0), dt);
  stepFx(dt, SIM.t);
  syncControls3D(dt);
  const blink = Math.floor(SIM.t * 2) % 2 === 0;
  drawFxFace('A', blink); drawFxFace('B', blink);
  for (const r of hlGroup.children) { r.lookAt(camera.position); const s = RM ? 1 : 1 + 0.12 * Math.sin(SIM.t * 2.6); r.scale.setScalar(s); r.material.opacity = RM ? 0.8 : 0.6 + 0.25 * Math.sin(SIM.t * 2.6); }
  stepOverlays(dt);
  if (PROC) checkStep();
  soundTick(dt);
}
// automatic quality steps: average frame time over 2 s above 20 ms -> one step down (pixel ratio, then shadows, then particles)
let PFRAC = 1; // share of flow particles drawn
function applyQuality() {
  renderer.setPixelRatio(qualPR()); resize();
  const sh = QUAL.level >= 2;
  if (sun.castShadow !== sh) { sun.castShadow = sh; SHADOW_DIRTY = true; }
  PFRAC = QUAL.level >= 2 ? 1 : QUAL.level === 1 ? 0.6 : 0.35;
}
function stepQuality(dt) {
  if (Q.has('shot') || Q.has('q') || document.hidden || dt > 0.25) return; // ignore tab switches and load hitches
  QUAL.acc += dt; QUAL.n++;
  if (QUAL.acc < 2) return;
  const ms = 1000 * QUAL.acc / QUAL.n; QUAL.acc = 0; QUAL.n = 0;
  if (QUAL.hold > 0) { QUAL.hold--; return; } // let the scene settle after load or a step
  if (ms > 20 && QUAL.level > 0) { QUAL.level--; QUAL.hold = 1; applyQuality(); console.log('[dce] quality ' + QUAL.level + ' (frame ' + ms.toFixed(1) + ' ms)'); }
}
let FRAMEERR = 0;
function frame() { try { frameInner(); } catch (e) { if (FRAMEERR++ < 3) console.error('[dce] frame error ' + (e && e.stack || e)); requestAnimationFrame(frame); } }
let FRAMES = 0;
function frameInner() {
  FRAMES++;
  if (Q.has('dbg') && FRAMES % 20 === 1) console.log('[dce] frame ' + FRAMES + ' t ' + performance.now().toFixed(0) + ' cap ' + elCap.style.display + ' load ' + $('#loading').style.display);
  const rawDt = clock.getDelta(), dt = Math.min(0.05, rawDt);
  stepCam(dt);
  if (MODE === 'orbit' && !CAMANIM) controls.update();
  stepWalk(dt);
  tick(dt);
  aHead.needsUpdate = aTail.needsUpdate = aCol.needsUpdate = aSize.needsUpdate = true;
  stepOverhead();
  if (EXPL.e !== EXPL.target) SHADOW_DIRTY = true;
  if (SHADOW_DIRTY && sun.castShadow) { renderer.shadowMap.needsUpdate = true; SHADOW_DIRTY = false; }
  renderer.render(scene, camera);
  stepQuality(rawDt);
  placeLabels(dt);
  uiAcc += dt;
  if (uiAcc > 0.25) {
    uiAcc = 0; renderHud(); updateFlow(); fitRight();
    if (SEL && SEL.part.motor) { const li = $('#info .facts li'); if (li) li.innerHTML = rpmLine(SEL.part.motor); }
    if (PANEL) { renderPanel(); const st = $('#sprayT'); if (st && /^flamex_/.test(PANEL)) { const Z = S.flamex[PANEL.slice(-1)]; st.textContent = Z.spray > 0 ? Z.spray.toFixed(1) + ' s' : ''; } }
    if (PANEL === 'collector' || PANEL === 'outside') { /* status text re-renders through the signature check */ }
  }
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { FPS = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; window.__fps = FPS; }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- self-test (?selftest=1): drives both procedures through the real actions
async function selfTest() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const run = (sec) => { for (let t = 0; t < sec; t += 1 / 30) tick(1 / 30); };
  const go = async (f, sec = 0.2) => { f(); run(sec); await sleep(320); };
  const ack = () => go(() => checkStep(true));
  const skip = () => go(() => { PROC.i++; enterStep(); });
  const tag = { name: 'Test', date: '2026-11-13', reason: 'self-test' };
  const report = (id) => console.log('[dce] selftest ' + id + ' step ' + PROC.i + '/' + PROCDEF().steps.length + ' mistakes ' + PROC.mistakes + (PROC.i < PROCDEF().steps.length ? ' stuck at ' + PROCDEF().steps[PROC.i].id : ' complete'));
  startProc('loto_fan_airlock'); await sleep(320);
  await ack(); await ack();
  await go(() => { for (const g of Object.keys(S.gates)) setGate(g, false); });
  await go(() => pressStarter('starter3', 'stop')); await go(() => pressStarter('starter1', 'stop')); await go(() => pressStarter('starter2', 'stop'));
  await go(() => { setEaton('eaton_out_fan', false); setEaton('eaton_out_blower', false); setEaton('eaton_out_airlock', false); });
  await go(() => { applyLock('eaton_out_fan', tag); applyLock('eaton_out_blower', tag); applyLock('eaton_out_airlock', tag); });
  await go(() => {}, 30);
  await ack(); await skip(); await skip();
  await go(() => { pressStarter('starter3', 'start'); pressStarter('starter2', 'start'); pressStarter('starter1', 'start'); });
  await go(() => {});
  await ack(); await ack(); await ack(); await ack();
  await go(() => { removeLock('eaton_out_fan'); removeLock('eaton_out_blower'); removeLock('eaton_out_airlock'); });
  await go(() => { setEaton('eaton_out_fan', true); setEaton('eaton_out_blower', true); setEaton('eaton_out_airlock', true); });
  await go(() => { pressStarter('starter3', 'start'); pressStarter('starter2', 'start'); pressStarter('starter1', 'start'); }, 1);
  await ack();
  report('loto');
  startProc('flamex_weekly'); await sleep(320);
  await go(() => fxButton('A', 'key'));
  for (const h of ['hatch_cnc', 'hatch_window', 'hatch_riser']) { await go(() => toggleHatch(h)); await go(() => toggleHatch(h)); }
  await go(() => fxButton('A', 'key')); await ack();
  await go(() => { toggleHatch('hatch_window'); clickControl({ ctl: 'bucket', act: 'toggle' }); });
  await go(() => { toggleHatch('hatch_cnc'); shine('A'); });
  await ack();
  await go(() => toggleHatch('hatch_cnc'));
  await go(() => fxButton('A', 'key')); await go(() => fxButton('A', 'ext'));
  await go(() => fxButton('A', 'reset'));
  await go(() => {}, 8); await go(() => fxButton('A', 'reset'));
  await go(() => fxButton('A', 'key'));
  await go(() => { clickControl({ ctl: 'bucket', act: 'toggle' }); toggleHatch('hatch_window'); });
  await go(() => clickControl({ ctl: 'hose', act: 'toggle' })); await ack();
  await go(() => { toggleHatch('hatch_riser'); shine('B'); }); await go(() => toggleHatch('hatch_riser'));
  await go(() => fxButton('B', 'key')); await go(() => fxButton('B', 'ext'));
  await go(() => {}, 8); await go(() => fxButton('B', 'reset'));
  await go(() => fxButton('B', 'key')); await go(() => fxButton('B', 'int'));
  await go(() => clickControl({ ctl: 'hose', act: 'toggle' }));
  report('weekly');
  // lockout rules
  resetScene(); PROC = null;
  setEaton('eaton_in_right', false); applyLock('eaton_in_right', tag);
  const r1 = setEaton('eaton_in_right', true).code, r2 = pressStarter('starter2', 'start').code, r3 = pressStarter('starter1', 'start').code;
  run(10);
  console.log('[dce] selftest lockout on:' + r1 + ' starter2:' + r2 + ' starter1:' + r3 + ' fan running:' + S.motor.fan.running + ' blower:' + S.motor.blower.running + ' airlock:' + S.motor.airlock.running);
  resetScene();
  setEaton('eaton_out_airlock', false); run(3);
  console.log('[dce] selftest outside airlock off -> fan:' + S.motor.fan.running + ' blower:' + S.motor.blower.running + ' airlock:' + S.motor.airlock.running + ' cone pile after 20 s:' + (run(20), PILE.cone.length));
  setEaton('eaton_out_airlock', true); run(1);
  console.log('[dce] selftest outside reclose with starter on -> airlock:' + S.motor.airlock.running);
  resetScene(); pressStarter('starter2', 'stop'); run(20);
  console.log('[dce] selftest blower off -> tee pile ' + PILE.tee.length);
  resetScene(); pressStarter('starter3', 'stop'); run(30);
  console.log('[dce] selftest fan off -> fan level ' + LV.fan.toFixed(3) + ' moving dust ' + Array.from(pState).filter(v => v === 0).length);
  resetScene();
}

// ---------------------------------------------------------------- start
setXray(true);
resetScene(true);
applyVisibility();
resize();
applyStop(0, false);
// scripted states for tests: ?shot=<viewpoint>&system=on|off&xray=1&cut=cyclone&panel=collector&proc=...&flamex=demo&ft=4&warm=3&walk=1
if (Q.get('system') === 'off') { systemOff(); for (const m of Object.keys(LV)) LV[m] = 0; for (const g of Object.keys(gateLv)) gateLv[g] = 0; initFlow(false); }
if (Q.has('gates')) { for (const g of Object.keys(S.gates)) S.gates[g] = false; for (const g of Q.get('gates').split(',')) if (g in S.gates) { S.gates[g] = true; gateLv[g] = 1; } initFlow(true); }
if (Q.get('shot')) { const i = VPS.findIndex(v => v.id === Q.get('shot')); if (i >= 0) applyStop(i, false); if (Q.get('shot') !== 'flamex') { DEMO = null; setCaption(VPS[i]?.captions?.[0]?.text || null); elFoot.style.display = 'none'; } }
if (Q.has('cam')) { const c = Q.get('cam').split(',').map(Number); camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); }
if (Q.get('view') && CT.views[Q.get('view')]) { const v = CT.views[Q.get('view')]; camera.position.copy(V3(v.position)); controls.target.copy(V3(v.target)); applyViewVis(v); }
if (Q.has('xray')) setXray(Q.get('xray') === '1');
if (Q.has('walls')) { TOG.shed_walls = TOG.shed_roof = Q.get('walls') === '1'; tourOverride.add('shed_walls'); tourOverride.add('shed_roof'); applyVisibility(); }
if (Q.get('cut')) for (const k of Q.get('cut').split(',')) if (CUT[k]) { setCutOpen(k, true); CUT[k].t = 0.999; }
if (Q.get('labels') === '0') { TOG.labels = false; }
if (Q.get('panel')) openPanel(Q.get('panel'));
if (Q.get('proc')) startProc(Q.get('proc'));
if (Q.get('walk') === '1') setMode('walk');
if (Q.get('flamex') === 'demo') startDemo();
if (Q.get('trip')) trip(Q.get('trip'), 'light');
{ // fast-forward the simulation
  const warm = +(Q.get('warm') || 0) + +(Q.get('ft') || 0);
  for (let t = 0; t < warm; t += 1 / 30) { stepCam(1 / 30); tick(1 / 30); }
  if (Q.has('cam')) { const c = Q.get('cam').split(',').map(Number); camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); CAMANIM = null; }
  if (warm) { CAMANIM = null; controls.update(); }
}
if (Q.has('story')) { storyStart(+Q.get('story') - 1, +(Q.get('phase') || 1) - 1); if (Q.has('zones')) TOG.zones = Q.get('zones') === '1'; if (Q.has('pause')) ST.paused = true; }
if (Q.has('zones') && !Q.has('story')) TOG.zones = Q.get('zones') === '1';
FLOWSIG = ''; updateFlow(); zoneLabels();
if (Q.has('sel')) { const b = FMB.find(x => x.id === Q.get('sel')); if (b) goFlow(b.id); }
{ // fast-forward the story (tests)
  const ft = +(Q.get('sft') || 0);
  for (let t = 0; t < ft; t += 1 / 30) { stepCam(1 / 30); tick(1 / 30); }
}
if (Q.get('selftest')) selfTest();
renderAll();
renderCaption();
if (Q.has('shot') || Q.has('story') || Q.has('sel')) setTimeout(() => console.log('[dce] labels ' + JSON.stringify(LREP) + ' fps ' + (window.__fps || 0).toFixed(1) + ' stage ' + elStage.clientWidth + 'x' + elStage.clientHeight + ' canvas ' + renderer.domElement.width + 'x' + renderer.domElement.height + ' cam ' + camera.position.toArray().map(v => v.toFixed(2)) + ' frames ' + FRAMES + ' motors ' + Object.keys(S.motor).filter(m => S.motor[m].running).join('+') + ' box ' + S.airlockBox + ' panel ' + PANEL + ' quality ' + QUAL.level + ' tour ' + (ST ? ST.i + 1 + '.' + (ST.k + 1) : '-')), +(Q.get('rep') || 6000));
$('#loading').style.display = 'none';
window.__ready = true;
window.__dce = { S, CUT, CUTHIDE, NODE, LV, PILE, TOG, camera, controls, scene, renderer, get PROC() { return PROC; }, get CAMANIM() { return CAMANIM; }, get ST() { return ST; }, get LREP() { return LREP; }, frameInner, storyStart, goFlow };
console.log('[dce] ready ' + JSON.stringify({ particles: NTOT, flowParticles: NP, nodes: Object.keys(NODE).length }));
if (Q.has('bench')) { const t0 = Date.now(); for (let n = 0; n < 120; n++) tick(1 / 60); console.log('[dce] bench tick ms ' + ((Date.now() - t0) / 120).toFixed(2)); }
requestAnimationFrame(frame);
