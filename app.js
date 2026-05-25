// --- Constants & Config ---
const STORAGE_KEY = 'tauben_manager_data_2026_v3';

// =============================================================
// GOOGLE MAPS – Plattform-Weiche (PC vs. Android APK/WebView)
// Android: geo:-Intent → öffnet native Maps-App
// PC/iOS:  window.open → öffnet Google Maps im neuen Tab
// =============================================================
function openMaps(lat, lng, label) {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label || 'Standort')})`;
    } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
}

// =============================================================
// RIRO KOORDINATEN-KONVERTER
// Format: DDMMSS,d  (z.B. 513321,9 = 51°33'21.9" → 51.5561°)
// Validierung: 513321,9 → 51 + 33/60 + 21.9/3600 = 51.5561 ✅
// =============================================================
function convertRiRoCoords(riRoStr) {
    if (!riRoStr || riRoStr === '000000,0') return null;
    const normalized = String(riRoStr).replace(',', '.').replace(/\s/g, '');
    const num = parseFloat(normalized);
    if (isNaN(num)) return null;
    // Grad-Anteil: die ersten 2 (Breite) oder 3 (Länge) Ziffern vor den Minuten
    // Heuristik: wenn > 1000000 → Länge (3-stellige Grad), sonst Breite (2-stellige Grad)
    const intPart = Math.floor(num);
    const intStr = String(intPart).padStart(6, '0');
    // Bei Längen > 100° hat intStr 7 Stellen → nutze 3 Grad-Ziffern
    const raw = String(Math.round(num * 10)).padStart(7, '0'); // DDDMMSS.d
    const fullStr = normalized; // z.B. "513321.9"
    const dotIdx = fullStr.indexOf('.');
    const integerPart = dotIdx >= 0 ? fullStr.substring(0, dotIdx) : fullStr;
    const decPart = dotIdx >= 0 ? fullStr.substring(dotIdx + 1) : '0';

    let deg, min, sec;
    if (integerPart.length <= 6) {
        // Breite: DDMMSS → 2 Grad + 2 Min + 2 Sek
        deg = parseInt(integerPart.substring(0, 2), 10);
        min = parseInt(integerPart.substring(2, 4), 10);
        sec = parseFloat(integerPart.substring(4, 6) + '.' + decPart);
    } else {
        // Länge: DDDMMSS → 3 Grad + 2 Min + 2 Sek
        deg = parseInt(integerPart.substring(0, 3), 10);
        min = parseInt(integerPart.substring(3, 5), 10);
        sec = parseFloat(integerPart.substring(5, 7) + '.' + decPart);
    }
    if (isNaN(deg) || isNaN(min) || isNaN(sec)) return null;
    return deg + min / 60 + sec / 3600;
}

// =============================================================
// RV-REGISTRY – Hierarchie: RegV → RV (erweiterbar für 403/05, 403/07 etc.)
// =============================================================
const RV_REGISTRY = [
    {
        regvId: '403',
        regvName: '403 Bochum und Umgebung',
        regvRiRoParam: '403Bochum und Umgebung', // URL-Parameter für bas-riro.de
        rvs: [
            { rvId: '40302', rvName: 'RV 403/02 Bochum-Nord', origrvnr: '40302' },
            { rvId: '40305', rvName: 'RV 403/05 Wattenscheid', origrvnr: '40305' },
            { rvId: '40306', rvName: 'RV 403/06 Herne-Wanne 1900', origrvnr: '40306' },
            { rvId: '40307', rvName: 'RV 403/07 Witten', origrvnr: '40307' },
            { rvId: '40308', rvName: 'RV 403/08 Gelsenkirchen 1894', origrvnr: '40308' },
        ]
    }
];

// Aktive RV (Standard: 403/06 Herne-Wanne 1900)
let ACTIVE_RV = RV_REGISTRY[0].rvs.find(rv => rv.rvId === '40306');

// Hilfsfunktion: RegV des aktiven RV ermitteln
function getActiveRegV() {
    return RV_REGISTRY.find(r => r.rvs.includes(ACTIVE_RV)) || RV_REGISTRY[0];
}

// =============================================================
// STAMMDATEN – Alle RVs  (Stand: 30.04.2026)
// Jeder Eintrag hat ein rvId-Feld → sofort erweiterbar für 403/05, 403/07
// =============================================================
const ALL_RV_MEMBERS = [
    // -- RV 403/02 Bochum-Nord --
    { rvId: '40302', persNr: '02.001', name: 'Kalka,Hans', verein: '01187', vereinName: 'Augusta-Viktoria', latRiro: '513111,2', lonRiro: '071032,8', dvNr: '122127' },
    { rvId: '40302', persNr: '02.002', name: 'Schreiber Jürgen', verein: '01187', vereinName: 'Augusta-Viktoria', latRiro: '513217,7', lonRiro: '071146,8', dvNr: '122101' },
    { rvId: '40302', persNr: '07.001', name: 'Schaub,Friedh.+Matth', verein: '00622', vereinName: 'Niegedacht', latRiro: '513026,7', lonRiro: '071536,8', dvNr: '121345' },
    { rvId: '40302', persNr: '10.002', name: 'Neumann & Frau', verein: '00783', vereinName: 'Heimkehr Hofstede', latRiro: '513014,7', lonRiro: '070839,0', dvNr: '122493' },
    { rvId: '40302', persNr: '10.004', name: 'Fray,Raimund', verein: '00783', vereinName: 'Heimkehr Hofstede', latRiro: '512903,0', lonRiro: '071134,6', dvNr: '196248' },
    { rvId: '40302', persNr: '10.005', name: 'Scheitza,Norbert', verein: '00783', vereinName: 'Heimkehr Hofstede', latRiro: '513322,2', lonRiro: '071253,2', dvNr: '167408' },
    { rvId: '40302', persNr: '10.013', name: 'F+D Steinhoff-Cornel', verein: '00783', vereinName: 'Heimkehr Hofstede', latRiro: '513007,1', lonRiro: '071303,5', dvNr: '121191' },
    { rvId: '40302', persNr: '11.001', name: 'Brockmeier,Karl-H.', verein: '02437', vereinName: 'Luftpost Erle', latRiro: '513338,0', lonRiro: '070449,6', dvNr: '121862' },
    { rvId: '40302', persNr: '12.003', name: 'Leske,Alex', verein: '00905', vereinName: 'Columbia Hamme', latRiro: '512905,7', lonRiro: '071227,8', dvNr: '121140' },
    { rvId: '40302', persNr: '12.004', name: 'Leske,Carsten', verein: '00905', vereinName: 'Columbia Hamme', latRiro: '512903,3', lonRiro: '071139,4', dvNr: '178767' },
    { rvId: '40302', persNr: '12.005', name: 'Leske,Dietlinde', verein: '00905', vereinName: 'Columbia Hamme', latRiro: '512903,1', lonRiro: '071136,1', dvNr: '707112' },
    { rvId: '40302', persNr: '13.004', name: 'Schübbe,Herbert', verein: '00920', vereinName: 'Heimatliebe', latRiro: '513112,6', lonRiro: '071408,2', dvNr: '122064' },
    { rvId: '40302', persNr: '13.006', name: 'Team Teubert', verein: '00920', vereinName: 'Heimatliebe', latRiro: '513105,7', lonRiro: '071348,6', dvNr: '123077' },
    { rvId: '40302', persNr: '13.009', name: 'Schulz,Heike', verein: '00920', vereinName: 'Heimatliebe', latRiro: '513115,7', lonRiro: '071603,1', dvNr: '728739' },
    { rvId: '40302', persNr: '17.002', name: 'Frank,Peter', verein: '07914', vereinName: 'Heimweh', latRiro: '513031,1', lonRiro: '070911,5', dvNr: '122155' },
    { rvId: '40302', persNr: '18.001', name: 'Familie Tigges', verein: '01788', vereinName: 'Sturm Riemke', latRiro: '513049,0', lonRiro: '071221,2', dvNr: '799586' },
    { rvId: '40302', persNr: '28.003', name: 'Ziegenbein,Frank', verein: '02825', vereinName: 'Columbia Hordel', latRiro: '513012,8', lonRiro: '070910,9', dvNr: '707049' },
    { rvId: '40302', persNr: '32.008', name: 'Kobus,Andreas', verein: '03869', vereinName: 'Vereinte Freunde', latRiro: '512956,9', lonRiro: '071053,3', dvNr: '121598' },
    // -- RV 403/05 Wattenscheid --
    { rvId: '40305', persNr: '01.002', name: 'Skroch,H.+I.+M.', verein: '00921', vereinName: 'Heimkehr Wimmelh.', latRiro: '512650,3', lonRiro: '071226,6', dvNr: '193645' },
    { rvId: '40305', persNr: '01.003', name: 'Baltrusch,B.', verein: '00921', vereinName: 'Heimkehr Wimmelh.', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40305', persNr: '03.002', name: 'Greife-Baczewski', verein: '02665', vereinName: 'Blitz', latRiro: '512844,6', lonRiro: '070933,5', dvNr: '178114' },
    { rvId: '40305', persNr: '03.003', name: 'Erz', verein: '02665', vereinName: 'Blitz', latRiro: '512655,7', lonRiro: '071019,2', dvNr: '122362' },
    { rvId: '40305', persNr: '03.004', name: 'Dworak,Miroslav', verein: '02665', vereinName: 'Blitz', latRiro: '512903,9', lonRiro: '071012,2', dvNr: '707010' },
    { rvId: '40305', persNr: '03.009', name: 'Löffler', verein: '02665', vereinName: 'Blitz', latRiro: '513016,7', lonRiro: '070914,8', dvNr: '121431' },
    { rvId: '40305', persNr: '04.002', name: 'Olschewski,Artur', verein: '01006', vereinName: 'Eilbote Eppendorf', latRiro: '512747,5', lonRiro: '070955,0', dvNr: '122975' },
    { rvId: '40305', persNr: '06.009', name: 'Richter / Lipski', verein: '00000', vereinName: 'Verein -06-', latRiro: '513627,8', lonRiro: '070427,4', dvNr: '' },
    { rvId: '40305', persNr: '07.001', name: 'Fam.Hoffmann', verein: '02667', vereinName: 'Eilbote Lohrheide', latRiro: '512902,0', lonRiro: '070629,3', dvNr: '182689' },
    { rvId: '40305', persNr: '07.002', name: 'Kaczmarek, Marc', verein: '02667', vereinName: 'Eilbote Lohrheide', latRiro: '512901,9', lonRiro: '070630,4', dvNr: '795737' },
    { rvId: '40305', persNr: '07.003', name: 'Jankowski', verein: '02667', vereinName: 'Eilbote Lohrheide', latRiro: '513014,9', lonRiro: '070910,2', dvNr: '122325' },
    { rvId: '40305', persNr: '07.006', name: 'Cznotka, Andreas', verein: '02667', vereinName: 'Eilbote Lohrheide', latRiro: '513021,4', lonRiro: '070734,5', dvNr: '799904' },
    { rvId: '40305', persNr: '11.002', name: 'Schulte, Michael', verein: '00740', vereinName: 'Frisch Gewagt', latRiro: '513006,9', lonRiro: '071023,3', dvNr: '177814' },
    { rvId: '40305', persNr: '11.003', name: 'Banschewitz', verein: '00740', vereinName: 'Frisch Gewagt', latRiro: '512947,0', lonRiro: '070900,8', dvNr: '121436' },
    { rvId: '40305', persNr: '11.004', name: 'Bejda, Sascha', verein: '00740', vereinName: 'Frisch Gewagt', latRiro: '512802,0', lonRiro: '071030,6', dvNr: '180657' },
    { rvId: '40305', persNr: '12.002', name: 'Leske,Alex', verein: '02246', vereinName: 'Froh Wiedersehen', latRiro: '512903,1', lonRiro: '071136,1', dvNr: '121140' },
    { rvId: '40305', persNr: '12.003', name: 'Leske,Carsten', verein: '02246', vereinName: 'Froh Wiedersehen', latRiro: '512903,3', lonRiro: '071139,4', dvNr: '178767' },
    { rvId: '40305', persNr: '12.005', name: 'Senditzki,Anke', verein: '02246', vereinName: 'Froh Wiedersehen', latRiro: '512758,1', lonRiro: '071101,6', dvNr: '800955' },
    { rvId: '40305', persNr: '12.006', name: 'Trzaska,Jürgen', verein: '02246', vereinName: 'Froh Wiedersehen', latRiro: '512541,0', lonRiro: '070916,1', dvNr: '182722' },
    { rvId: '40305', persNr: '16.004', name: 'Ludwig,Erich', verein: '00128', vereinName: 'Heimatliebe', latRiro: '512718,0', lonRiro: '070503,0', dvNr: '116380' },
    { rvId: '40305', persNr: '18.009', name: 'Balzerowiak', verein: '02744', vereinName: 'Schwarzer Vogel', latRiro: '512807,7', lonRiro: '070615,8', dvNr: '168096' },
    { rvId: '40305', persNr: '19.001', name: 'Langanke,Dieter', verein: '01913', vereinName: 'Heimkehr Leithe', latRiro: '513021,7', lonRiro: '070733,4', dvNr: '707125' },
    { rvId: '40305', persNr: '21.001', name: 'Klos, Heinz', verein: '01108', vereinName: 'Eilbote Kray', latRiro: '512838,3', lonRiro: '070933,5', dvNr: '121378' },
    { rvId: '40305', persNr: '21.002', name: 'Wittke,Bernd', verein: '01108', vereinName: 'Eilbote Kray', latRiro: '512903,2', lonRiro: '071138,5', dvNr: '121445' },
    { rvId: '40305', persNr: '21.003', name: 'Fankideiski,Udo', verein: '01108', vereinName: 'Eilbote Kray', latRiro: '512814,4', lonRiro: '071024,7', dvNr: '122960' },
    { rvId: '40305', persNr: '31.001', name: 'Przybysz,Franz-Josef', verein: '06248', vereinName: 'Glück auf unserFritz', latRiro: '513231,0', lonRiro: '070844,6', dvNr: '800799' },
    { rvId: '40305', persNr: '31.002', name: 'Moches,Mirco', verein: '06248', vereinName: 'Glück auf unserFritz', latRiro: '513230,2', lonRiro: '070845,9', dvNr: '183770' },
    { rvId: '40305', persNr: '58.001', name: 'Team Bremen', verein: '02585', vereinName: 'Horst-Haverkamp', latRiro: '513204,7', lonRiro: '070654,4', dvNr: '200715' },
    { rvId: '40305', persNr: '58.002', name: 'Schröder', verein: '02585', vereinName: 'Horst-Haverkamp', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '201851' },
    { rvId: '40305', persNr: '60.001', name: 'Hinz+Ko+Apphuhn+Davi', verein: '40301', vereinName: 'RV 403/01', latRiro: '512612,9', lonRiro: '071328,7', dvNr: '' },
    { rvId: '40305', persNr: '60.002', name: 'Team Haas+Moese', verein: '40301', vereinName: 'RV 403/01', latRiro: '513109,5', lonRiro: '070245,3', dvNr: '' },
    { rvId: '40305', persNr: '60.003', name: 'SG Vorberg+Jügel', verein: '40301', vereinName: 'RV 403/01', latRiro: '512941,9', lonRiro: '070103,8', dvNr: '' },
    { rvId: '40305', persNr: '60.004', name: 'Fam. Vonau', verein: '40301', vereinName: 'RV 403/01', latRiro: '512952,2', lonRiro: '070351,7', dvNr: '' },
    { rvId: '40305', persNr: '60.005', name: 'Th. Eckelhoff', verein: '40301', vereinName: 'RV 403/01', latRiro: '513140,0', lonRiro: '070650,2', dvNr: '' },
    { rvId: '40305', persNr: '60.006', name: 'Team Kühn', verein: '40301', vereinName: 'RV 403/01', latRiro: '513020,3', lonRiro: '070747,1', dvNr: '' },
    { rvId: '40305', persNr: '60.007', name: 'SG Tacke-Busch', verein: '40301', vereinName: 'RV 403/01', latRiro: '512806,3', lonRiro: '070613,0', dvNr: '' },
    { rvId: '40305', persNr: '60.008', name: 'Team BS Siegburger', verein: '40301', vereinName: 'RV 403/01', latRiro: '512903,1', lonRiro: '071135,5', dvNr: '' },
    { rvId: '40305', persNr: '60.009', name: 'Leske,Carsten', verein: '40301', vereinName: 'RV 403/01', latRiro: '512903,3', lonRiro: '071139,4', dvNr: '178767' },
    { rvId: '40305', persNr: '60.010', name: 'Leske,Alex', verein: '40301', vereinName: 'RV 403/01', latRiro: '512905,7', lonRiro: '071227,8', dvNr: '121140' },
    { rvId: '40305', persNr: '60.011', name: 'Wittke,Bernd', verein: '40301', vereinName: 'RV 403/01', latRiro: '512903,2', lonRiro: '071138,5', dvNr: '121445' },
    { rvId: '40305', persNr: '60.012', name: 'Banhold', verein: '40301', vereinName: 'RV 403/01', latRiro: '512922,6', lonRiro: '070023,2', dvNr: '' },
    { rvId: '40305', persNr: '60.013', name: 'Lorenz,Herbert', verein: '40301', vereinName: 'RV 403/01', latRiro: '512629,8', lonRiro: '071055,6', dvNr: '' },
    { rvId: '40305', persNr: '60.014', name: 'Hinz+Ko+Appuhn+David', verein: '40301', vereinName: 'RV 403/01', latRiro: '512612,9', lonRiro: '071328,7', dvNr: '' },
    { rvId: '40305', persNr: '60.015', name: 'Ketzler G+C', verein: '40301', vereinName: 'RV 403/01', latRiro: '512903,1', lonRiro: '071136,6', dvNr: '' },
    { rvId: '40305', persNr: '60.180', name: 'Louis Stolz', verein: '40301', vereinName: 'RV 403/01', latRiro: '513156,2', lonRiro: '070750,7', dvNr: '' },
    // -- RV 403/06 Herne-Wanne 1900 (vollstaendig, Stand 30.04.2026) --
    { rvId: '40306', persNr: '07.002', name: 'SG K.+I-K Waschelitz', verein: '01471', vereinName: 'Froh Wiedersehn', latRiro: '513117,8', lonRiro: '071604,8', dvNr: '799590' },
    { rvId: '40306', persNr: '12.001', name: 'Paszkowiak,WRRL', verein: '00000', vereinName: 'Verein -12-', latRiro: '512819,2', lonRiro: '071631,5', dvNr: '121245' },
    { rvId: '40306', persNr: '14.025', name: 'Sander,Heinz J.+Ute', verein: '01576', vereinName: 'Hüte Dich', latRiro: '513321,5', lonRiro: '071252,6', dvNr: '157654' },
    { rvId: '40306', persNr: '14.039', name: 'Jakubczak, Heinz', verein: '01576', vereinName: 'Hüte Dich', latRiro: '513322,4', lonRiro: '071311,0', dvNr: '732751' },
    { rvId: '40306', persNr: '15.003', name: 'Team Hupe/Wasser', verein: '00000', vereinName: 'Verein -15-', latRiro: '513352,4', lonRiro: '072338,6', dvNr: '' },
    { rvId: '40306', persNr: '18.004', name: 'Westhoff, Stefan', verein: '02341', vereinName: 'Siegespalme', latRiro: '513750,7', lonRiro: '071456,4', dvNr: '725081' },
    { rvId: '40306', persNr: '18.005', name: 'Kussin, Edgar', verein: '02341', vereinName: 'Siegespalme', latRiro: '513348,7', lonRiro: '071207,6', dvNr: '116000' },
    { rvId: '40306', persNr: '18.011', name: 'Stolorz, Norbert', verein: '02341', vereinName: 'Siegespalme', latRiro: '513356,1', lonRiro: '071239,7', dvNr: '706185' },
    { rvId: '40306', persNr: '18.012', name: 'Wolany,Joachim', verein: '02341', vereinName: 'Siegespalme', latRiro: '513347,5', lonRiro: '071311,5', dvNr: '706054' },
    { rvId: '40306', persNr: '18.013', name: 'Krecichwost,Kl.-Adam', verein: '02341', vereinName: 'Siegespalme', latRiro: '513347,5', lonRiro: '071310,6', dvNr: '727434' },
    { rvId: '40306', persNr: '26.002', name: 'D`Alonzo,Genoino', verein: '03056', vereinName: 'Gut Flug', latRiro: '513257,3', lonRiro: '071534,6', dvNr: '183196' },
    { rvId: '40306', persNr: '41.010', name: 'Stolz, Louis', verein: '07637', vereinName: 'Unser Sport Bismarck', latRiro: '513156,2', lonRiro: '070750,7', dvNr: '179782' },
    { rvId: '40306', persNr: '41.012', name: 'Leberecht, Dietrich', verein: '07637', vereinName: 'Unser Sport Bismarck', latRiro: '513153,5', lonRiro: '070751,7', dvNr: '115821' },
    { rvId: '40306', persNr: '46.002', name: 'HolperHeidLückenbach', verein: '09084', vereinName: 'Reiselust', latRiro: '513321,9', lonRiro: '071256,3', dvNr: '237037' },
    { rvId: '40306', persNr: '46.007', name: 'Kaziuta,Aliak Sandr.', verein: '09084', vereinName: 'Reiselust', latRiro: '512630,4', lonRiro: '072140,6', dvNr: '178466' },
    { rvId: '40306', persNr: '46.008', name: 'Hülkenberg, Peter', verein: '09084', vereinName: 'Reiselust', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '707199' },
    { rvId: '40306', persNr: '46.015', name: 'Schmidt, Andre', verein: '09084', vereinName: 'Reiselust', latRiro: '513206,5', lonRiro: '070623,1', dvNr: '734152' },
    { rvId: '40306', persNr: '46.017', name: 'Weinkopf, Peter', verein: '09084', vereinName: 'Reiselust', latRiro: '513207,0', lonRiro: '070620,9', dvNr: '794183' },
    { rvId: '40306', persNr: '46.019', name: 'Huhn,Egon', verein: '09084', vereinName: 'Reiselust', latRiro: '513153,4', lonRiro: '070753,7', dvNr: '159007' },
    { rvId: '40306', persNr: '50.035', name: 'Schubert,Ernst-Günt.', verein: '07294', vereinName: 'Konkurrenz', latRiro: '513239,5', lonRiro: '071506,2', dvNr: '102084' },
    { rvId: '40306', persNr: '51.002', name: 'Kostrzewa,Hermann', verein: '07738', vereinName: 'Fliege Sicher', latRiro: '513217,0', lonRiro: '071534,5', dvNr: '173975' },
    { rvId: '40306', persNr: '51.007', name: 'Team BS Siegburger', verein: '07738', vereinName: 'Fliege Sicher', latRiro: '512903,1', lonRiro: '071135,5', dvNr: '727301' },
    { rvId: '40306', persNr: '62.001', name: 'Hellrung&J+L.K.', verein: '03345', vereinName: 'Vorwärts Eickel', latRiro: '513129,7', lonRiro: '071127,9', dvNr: '122102' },
    { rvId: '40306', persNr: '62.002', name: 'Agethen,Heinz', verein: '03345', vereinName: 'Vorwärts Eickel', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '707192' },
    { rvId: '40306', persNr: '62.003', name: 'Kaminski,Jan', verein: '03345', vereinName: 'Vorwärts Eickel', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '179116' },
    { rvId: '40306', persNr: '62.004', name: 'Kaminski,Lea', verein: '03345', vereinName: 'Vorwärts Eickel', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '184887' },
    { rvId: '40306', persNr: '67.014', name: 'M.Tigges', verein: '03595', vereinName: 'Vorwärts', latRiro: '513048,8', lonRiro: '071221,6', dvNr: '134711' },
    { rvId: '40306', persNr: '68.014', name: 'SG v.d.Heusen+Prange', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513240,9', lonRiro: '071052,3', dvNr: '122952' },
    { rvId: '40306', persNr: '68.016', name: 'Gebr. Borg,Josef+Joh', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513311,7', lonRiro: '071547,4', dvNr: '122033' },
    { rvId: '40306', persNr: '68.017', name: 'Schulte, Michael', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513006,9', lonRiro: '071023,3', dvNr: '177814' },
    { rvId: '40306', persNr: '68.020', name: 'Herbst,Jürgen', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513239,8', lonRiro: '071505,8', dvNr: '164600' },
    { rvId: '40306', persNr: '68.023', name: 'Käßner,Lothar', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513111,6', lonRiro: '070949,9', dvNr: '122130' },
    { rvId: '40306', persNr: '68.024', name: 'Feldberg, Rolf', verein: '02556', vereinName: 'Fortuna Böring', latRiro: '513305,3', lonRiro: '071154,3', dvNr: '164657' },
    // -- RV 403/07 Witten --
    { rvId: '40307', persNr: '01.002', name: 'Dyla,Yerzy', verein: '00166', vereinName: 'Zurück zum Toren', latRiro: '513049,3', lonRiro: '071909,1', dvNr: '180726' },
    { rvId: '40307', persNr: '01.004', name: 'Sokolowski,Eugen', verein: '00166', vereinName: 'Zurück zum Toren', latRiro: '513138,9', lonRiro: '072303,6', dvNr: '736950' },
    { rvId: '40307', persNr: '04.001', name: 'Norbert Schrowang', verein: '00547', vereinName: 'Heimkehr Herbede', latRiro: '512529,2', lonRiro: '071704,7', dvNr: '101907' },
    { rvId: '40307', persNr: '04.002', name: 'Detlev Hennig', verein: '00547', vereinName: 'Heimkehr Herbede', latRiro: '512404,3', lonRiro: '071615,7', dvNr: '135970' },
    { rvId: '40307', persNr: '07.006', name: 'Wittig, Christian', verein: '02272', vereinName: 'Luftbote Wilhelmshöh', latRiro: '512924,0', lonRiro: '072101,0', dvNr: '122982' },
    { rvId: '40307', persNr: '07.007', name: 'Hillringhaus, Frank', verein: '02272', vereinName: 'Luftbote Wilhelmshöh', latRiro: '512957,3', lonRiro: '072128,5', dvNr: '123207' },
    { rvId: '40307', persNr: '07.010', name: 'Gawenda', verein: '02272', vereinName: 'Luftbote Wilhelmshöh', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '09.001', name: 'Voßkuhle, Werner', verein: '00892', vereinName: 'Sturmvogel', latRiro: '512627,4', lonRiro: '071847,3', dvNr: '135532' },
    { rvId: '40307', persNr: '09.002', name: 'Hanfland,Michael', verein: '00892', vereinName: 'Sturmvogel', latRiro: '512708,5', lonRiro: '071916,5', dvNr: '175370' },
    { rvId: '40307', persNr: '09.007', name: 'Wrobel,Edmund', verein: '00892', vereinName: 'Sturmvogel', latRiro: '512704,8', lonRiro: '071915,5', dvNr: '727451' },
    { rvId: '40307', persNr: '09.012', name: 'Zawadzki,Jacek', verein: '00892', vereinName: 'Sturmvogel', latRiro: '512709,3', lonRiro: '071912,3', dvNr: '235054' },
    { rvId: '40307', persNr: '09.013', name: 'Detlev Hennig', verein: '00892', vereinName: 'Sturmvogel', latRiro: '512404,3', lonRiro: '071615,7', dvNr: '135970' },
    { rvId: '40307', persNr: '11.002', name: 'Blum,P/Möhrke,M', verein: '01008', vereinName: 'Ruhrbote Witten', latRiro: '512729,0', lonRiro: '072229,0', dvNr: '154855' },
    { rvId: '40307', persNr: '11.003', name: 'Naglik,Michael', verein: '01008', vereinName: 'Ruhrbote Witten', latRiro: '512657,1', lonRiro: '072054,9', dvNr: '170228' },
    { rvId: '40307', persNr: '11.006', name: 'Möhrke,Michael', verein: '01008', vereinName: 'Ruhrbote Witten', latRiro: '512733,3', lonRiro: '072421,0', dvNr: '734359' },
    { rvId: '40307', persNr: '11.007', name: 'Fennen,Uwe', verein: '01008', vereinName: 'Ruhrbote Witten', latRiro: '512606,2', lonRiro: '071829,6', dvNr: '193275' },
    { rvId: '40307', persNr: '11.008', name: 'Potrawa,Joachim', verein: '01008', vereinName: 'Ruhrbote Witten', latRiro: '512608,2', lonRiro: '072126,6', dvNr: '202167' },
    { rvId: '40307', persNr: '18.011', name: 'Stolorz,Norbert', verein: '00000', vereinName: 'Verein -18-', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '18.012', name: 'Wolany,Joachim', verein: '00000', vereinName: 'Verein -18-', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '28.002', name: 'Ölrich,Franz-Josef', verein: '01213', vereinName: 'Heimatliebe Papenhol', latRiro: '512634,1', lonRiro: '071805,9', dvNr: '135552' },
    { rvId: '40307', persNr: '31.002', name: 'Team Schröter', verein: '08144', vereinName: 'Alter Stamm', latRiro: '513146,1', lonRiro: '071902,2', dvNr: '123153' },
    { rvId: '40307', persNr: '32.001', name: 'Springborn,Karl-H.', verein: '06230', vereinName: 'Luftbote Persebeck', latRiro: '512733,3', lonRiro: '072421,0', dvNr: '121001' },
    { rvId: '40307', persNr: '32.002', name: 'Peczak,Marian', verein: '06230', vereinName: 'Luftbote Persebeck', latRiro: '512649,9', lonRiro: '072314,0', dvNr: '180367' },
    { rvId: '40307', persNr: '33.001', name: 'Burow,Fritz', verein: '01882', vereinName: 'Auf Zum Borbachtal', latRiro: '512235,2', lonRiro: '072842,5', dvNr: '181661' },
    { rvId: '40307', persNr: '33.007', name: 'Wellershoff,Hendrik', verein: '01882', vereinName: 'Auf Zum Borbachtal', latRiro: '512615,0', lonRiro: '072232,0', dvNr: '236172' },
    { rvId: '40307', persNr: '33.009', name: 'Krusch,Klaus', verein: '01882', vereinName: 'Auf Zum Borbachtal', latRiro: '512403,7', lonRiro: '072641,5', dvNr: '194335' },
    { rvId: '40307', persNr: '33.011', name: 'Niemeyer,Eike+Oliver', verein: '01882', vereinName: 'Auf Zum Borbachtal', latRiro: '512612,9', lonRiro: '072241,8', dvNr: '179298' },
    { rvId: '40307', persNr: '36.006', name: 'Team Wittkamp', verein: '00906', vereinName: 'Eintracht', latRiro: '512710,4', lonRiro: '071917,4', dvNr: '136096' },
    { rvId: '40307', persNr: '36.017', name: 'Jörg Ponath', verein: '00906', vereinName: 'Eintracht', latRiro: '512640,0', lonRiro: '071759,6', dvNr: '202170' },
    { rvId: '40307', persNr: '41.010', name: 'Stolz,Louis', verein: '00000', vereinName: 'Verein -41-', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '45.001', name: 'Team Bennemann', verein: '07185', vereinName: 'Edeltaube Ruedinghau', latRiro: '512641,2', lonRiro: '072321,5', dvNr: '136097' },
    { rvId: '40307', persNr: '46.009', name: 'Troshupa,Naser', verein: '08483', vereinName: 'Club Annen', latRiro: '512244,1', lonRiro: '072621,0', dvNr: '794305' },
    { rvId: '40307', persNr: '48.001', name: 'Czeszynski,Beate', verein: '07819', vereinName: 'Bleibe Treu', latRiro: '512944,8', lonRiro: '071815,0', dvNr: '707071' },
    { rvId: '40307', persNr: '49.001', name: 'Hasenkamp,Bernd', verein: '01833', vereinName: 'Einigkeit Arday', latRiro: '512630,4', lonRiro: '072140,6', dvNr: '728680' },
    { rvId: '40307', persNr: '51.002', name: 'Giesbert Dr. Klaus', verein: '00187', vereinName: 'Columbia Dortmund', latRiro: '512702,6', lonRiro: '072544,2', dvNr: '121563' },
    { rvId: '40307', persNr: '52.004', name: 'Ketzler,G+C.', verein: '08418', vereinName: 'Treu zur Heimat Herd', latRiro: '512903,1', lonRiro: '071136,6', dvNr: '196234' },
    { rvId: '40307', persNr: '59.007', name: 'Gollor, Herbert', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '512931,4', lonRiro: '071759,2', dvNr: '707072' },
    { rvId: '40307', persNr: '59.008', name: 'Mackowiak,Reiner', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '512912,4', lonRiro: '071822,4', dvNr: '122715' },
    { rvId: '40307', persNr: '59.009', name: 'Bolz+Bode+Lucht', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '512740,9', lonRiro: '071426,1', dvNr: '154298' },
    { rvId: '40307', persNr: '59.010', name: 'Kohut,Ernst', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '512740,4', lonRiro: '071421,2', dvNr: '728737' },
    { rvId: '40307', persNr: '59.015', name: 'Jaeschke,Oliver', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '513010,6', lonRiro: '071626,2', dvNr: '123073' },
    { rvId: '40307', persNr: '59.018', name: 'Macha,Stefan', verein: '07807', vereinName: 'Edeltaube Grümerbaum', latRiro: '512604,0', lonRiro: '071337,4', dvNr: '159907' },
    { rvId: '40307', persNr: '62.001', name: 'Hellrung-Agethen', verein: '00000', vereinName: 'Verein -62-', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '67.001', name: 'J.Cynta', verein: '00000', vereinName: 'Verein -67-', latRiro: '512527,6', lonRiro: '071629,5', dvNr: '' },
    { rvId: '40307', persNr: '67.014', name: 'M.Tigges & I+J+N+E+P', verein: '00000', vereinName: 'Verein -67-', latRiro: '000000,0', lonRiro: '000000,0', dvNr: '' },
    { rvId: '40307', persNr: '69.001', name: 'Sprawe,Erwin', verein: '07130', vereinName: 'In Treue Fest Schnee', latRiro: '512543,0', lonRiro: '072529,1', dvNr: '135384' },
    // -- RV 403/08 Gelsenkirchen 1894 --
    { rvId: '40308', persNr: '01.001', name: 'Muench', verein: '07333', vereinName: 'Ohne Furcht Hüllen', latRiro: '512835,3', lonRiro: '070230,0', dvNr: '116683' },
    { rvId: '40308', persNr: '01.004', name: 'Steinmann,D.+U.', verein: '07333', vereinName: 'Ohne Furcht Hüllen', latRiro: '513118,6', lonRiro: '070717,2', dvNr: '121937' },
    { rvId: '40308', persNr: '04.007', name: 'Team Leon Graw', verein: '06892', vereinName: 'Eilbote Spoppenberg', latRiro: '512851,7', lonRiro: '070234,3', dvNr: '117226' },
    { rvId: '40308', persNr: '05.001', name: 'Reidegeld,Frank', verein: '03185', vereinName: 'Siegestaube Schalke', latRiro: '513156,2', lonRiro: '070539,4', dvNr: '121663' },
    { rvId: '40308', persNr: '05.002', name: 'Th.Eckelhoff', verein: '03185', vereinName: 'Siegestaube Schalke', latRiro: '513140,0', lonRiro: '070650,2', dvNr: '705483' },
    { rvId: '40308', persNr: '08.001', name: 'Majer,Willi', verein: '04506', vereinName: 'Immer durch Bismarck', latRiro: '513141,2', lonRiro: '070557,8', dvNr: '156725' },
    { rvId: '40308', persNr: '08.002', name: 'Klaus Überall', verein: '04506', vereinName: 'Immer durch Bismarck', latRiro: '513009,1', lonRiro: '070544,2', dvNr: '180547' },
    { rvId: '40308', persNr: '08.003', name: 'Robitschko', verein: '04506', vereinName: 'Immer durch Bismarck', latRiro: '513154,8', lonRiro: '070749,9', dvNr: '121669' },
    { rvId: '40308', persNr: '14.001', name: 'Münch', verein: '00968', vereinName: 'Heimatliebe Katernbe', latRiro: '512835,3', lonRiro: '070230,0', dvNr: '116683' },
    { rvId: '40308', persNr: '14.002', name: 'K.-H. Schwinning', verein: '00968', vereinName: 'Heimatliebe Katernbe', latRiro: '512835,1', lonRiro: '070037,1', dvNr: '116757' },
    { rvId: '40308', persNr: '14.007', name: 'Banhold', verein: '00968', vereinName: 'Heimatliebe Katernbe', latRiro: '512922,6', lonRiro: '070023,2', dvNr: '116777' },
    { rvId: '40308', persNr: '14.013', name: 'Team Gille', verein: '00968', vereinName: 'Heimatliebe Katernbe', latRiro: '512950,6', lonRiro: '070222,1', dvNr: '197649' },
    { rvId: '40308', persNr: '14.034', name: 'SG Vorberg & Jügel', verein: '00968', vereinName: 'Heimatliebe Katernbe', latRiro: '512941,9', lonRiro: '070103,8', dvNr: '734125' },
    { rvId: '40308', persNr: '16.002', name: 'Herbst-Stahl', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '512922,8', lonRiro: '070906,3', dvNr: '724690' },
    { rvId: '40308', persNr: '16.004', name: 'U.Stollfuss', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '512953,4', lonRiro: '070351,2', dvNr: '122576' },
    { rvId: '40308', persNr: '16.005', name: 'Team Hofstetter', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '513034,7', lonRiro: '070157,6', dvNr: '123456' },
    { rvId: '40308', persNr: '16.008', name: 'Team Wolbeck', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '513018,0', lonRiro: '070258,6', dvNr: '705517' },
    { rvId: '40308', persNr: '16.012', name: 'Stollfuss', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '512951,5', lonRiro: '070352,8', dvNr: '705948' },
    { rvId: '40308', persNr: '16.013', name: 'Jansen,H.W.', verein: '07266', vereinName: 'Einigkeit Ueckendorf', latRiro: '512950,1', lonRiro: '070626,5', dvNr: '121909' },
    { rvId: '40308', persNr: '23.001', name: 'Fam. Vonau', verein: '04507', vereinName: 'Über Tal und Höhen', latRiro: '512952,2', lonRiro: '070351,7', dvNr: '734101' },
    { rvId: '40308', persNr: '23.005', name: 'Ludwig Lischka', verein: '04507', vereinName: 'Über Tal und Höhen', latRiro: '513252,6', lonRiro: '070253,1', dvNr: '725080' },
    { rvId: '40308', persNr: '23.013', name: 'Fam. Bala', verein: '04507', vereinName: 'Über Tal und Höhen', latRiro: '512951,7', lonRiro: '070351,2', dvNr: '705840' },
    { rvId: '40308', persNr: '25.004', name: 'Team Haas-Moese', verein: '03246', vereinName: 'frohe Botschaft Heßl', latRiro: '513109,5', lonRiro: '070245,3', dvNr: '154555' },
    { rvId: '40308', persNr: '25.010', name: 'Hadji, Mohamed', verein: '03246', vereinName: 'frohe Botschaft Heßl', latRiro: '512856,6', lonRiro: '070004,5', dvNr: '184502' },
    { rvId: '40308', persNr: '25.011', name: 'Simon/Haslage', verein: '03246', vereinName: 'frohe Botschaft Heßl', latRiro: '512942,4', lonRiro: '070102,0', dvNr: '193381' },
    { rvId: '40308', persNr: '25.015', name: 'Assaher,Mustapha', verein: '03246', vereinName: 'frohe Botschaft Heßl', latRiro: '513051,7', lonRiro: '070337,3', dvNr: '182747' },
    { rvId: '40308', persNr: '28.001', name: 'Musga+Sohn', verein: '01037', vereinName: 'Luftbote Katernberg', latRiro: '512952,6', lonRiro: '070351,4', dvNr: '175913' },
    { rvId: '40308', persNr: '28.005', name: 'Dost', verein: '01037', vereinName: 'Luftbote Katernberg', latRiro: '512953,2', lonRiro: '070350,0', dvNr: '727800' },
    { rvId: '40308', persNr: '28.015', name: 'Grochala/Sidzik', verein: '01037', vereinName: 'Luftbote Katernberg', latRiro: '513158,7', lonRiro: '070045,3', dvNr: '182808' },
    { rvId: '40308', persNr: '30.016', name: 'Zamhoefer,W.', verein: '02986', vereinName: 'Siegespalme Katernbg', latRiro: '513030,8', lonRiro: '070300,7', dvNr: '116365' },
    { rvId: '40308', persNr: '33.014', name: 'Hofmann', verein: '04433', vereinName: 'Radio Schonnebeck', latRiro: '512834,2', lonRiro: '070334,5', dvNr: '117143' },
    { rvId: '40308', persNr: '35.003', name: 'Dolny,N.+G.', verein: '00208', vereinName: 'Heimkehr Altstadt', latRiro: '513008,2', lonRiro: '070513,4', dvNr: '123086' },
    { rvId: '40308', persNr: '38.002', name: 'Team Kühn', verein: '01436', vereinName: 'Fortuna Rotthausen', latRiro: '513020,3', lonRiro: '070747,1', dvNr: '164339' },
    { rvId: '40308', persNr: '38.007', name: 'Team Schallwig', verein: '01436', vereinName: 'Fortuna Rotthausen', latRiro: '512952,7', lonRiro: '070350,3', dvNr: '191963' },
    { rvId: '40308', persNr: '38.008', name: 'Pritzkow/Loos', verein: '01436', vereinName: 'Fortuna Rotthausen', latRiro: '513103,1', lonRiro: '070307,1', dvNr: '121692' },
    { rvId: '40308', persNr: '38.009', name: 'Jonda,G.+I.', verein: '01436', vereinName: 'Fortuna Rotthausen', latRiro: '512952,1', lonRiro: '070350,6', dvNr: '705850' },
    { rvId: '40308', persNr: '39.001', name: 'Sondermann, Udo', verein: '00696', vereinName: 'Flugpost-Bärendorf', latRiro: '512606,5', lonRiro: '071108,2', dvNr: '161379' },
    { rvId: '40308', persNr: '40.002', name: 'Borowski', verein: '01240', vereinName: 'Blitz Ückendorf', latRiro: '513021,1', lonRiro: '070745,4', dvNr: '122450' },
    { rvId: '40308', persNr: '40.004', name: 'Bierkandt', verein: '01240', vereinName: 'Blitz Ückendorf', latRiro: '513020,7', lonRiro: '070735,7', dvNr: '200638' },
    { rvId: '40308', persNr: '46.002', name: 'Wilhelm,Manfred', verein: '03087', vereinName: 'Über Land und Meer', latRiro: '513200,0', lonRiro: '065656,7', dvNr: '114664' },
    { rvId: '40308', persNr: '46.003', name: 'Bode. D.', verein: '03087', vereinName: 'Über Land und Meer', latRiro: '513121,8', lonRiro: '070051,6', dvNr: '116792' },
    { rvId: '40308', persNr: '47.005', name: 'Nebe,Danny', verein: '02742', vereinName: 'Kray Nord', latRiro: '512952,9', lonRiro: '070351,6', dvNr: '116923' },
    { rvId: '40308', persNr: '47.006', name: 'Niedergriesse/Willig', verein: '02742', vereinName: 'Kray Nord', latRiro: '512851,4', lonRiro: '070447,3', dvNr: '116928' },
    { rvId: '40308', persNr: '51.004', name: 'J.Heißig', verein: '03529', vereinName: 'Kanone Emschertal', latRiro: '513207,3', lonRiro: '070621,6', dvNr: '178565' },
];

// Aktiver Züchter (Standard: HolperHeidLückenbach, persNr 46.002)
let ACTIVE_BREEDER = ALL_RV_MEMBERS.find(m => m.persNr === '46.002') || ALL_RV_MEMBERS[0];

// Koordinaten des aktiven Züchters (aus RiRo-Format konvertiert)
function getActiveBreederCoords() {
    const lat = convertRiRoCoords(ACTIVE_BREEDER.latRiro);
    const lon = convertRiRoCoords(ACTIVE_BREEDER.lonRiro);
    return {
        lat: lat !== null ? lat : 51.556083,
        lon: lon !== null ? lon : 7.215639
    };
}

// HOME_LAT / HOME_LON dynamisch aus aktivem Züchter
let HOME_LAT = getActiveBreederCoords().lat;
let HOME_LON = getActiveBreederCoords().lon;

// --- Reiseplan 2026 – Koordinaten aus offizieller Auflaßort-Liste (DMS→Dezimal) ---
// DMS-Formel: deg + min/60 + sec/3600
const REISEPLAN_2026 = [
    // Aschaffenburg AONR 11: 49°14'58.10"N  9°02'20.10"E
    { datum: "26.04.2026", ort: "Aschaffenburg", km: 210, lat: 49.2495, lon: 9.0389 },
    // Wertheim AONR 298: 49°45'21.70"N  9°29'34.60"E
    { datum: "03.05.2026", ort: "Wertheim", km: 254, lat: 49.7560, lon: 9.4929 },
    // Schlüsselfeld – nicht in offizieller Liste, Näherungswert beibehalten
    { datum: "10.05.2026", ort: "Schluessselfeld", km: 310, lat: 49.7505, lon: 10.6622 },
    // Erlangen AONR 276: 49°38'27.80"N  11°02'16.60"E
    { datum: "17.05.2026", ort: "Erlangen", km: 343, lat: 49.6411, lon: 11.0379 },
    // Lauf a.d.Pegnitz AONR 254: 49°29'28.30"N  11°16'47.50"E
    { datum: "24.05.2026", ort: "Lauf a.d.Pegnitz", km: 357, lat: 49.4912, lon: 11.2799 },
    // Hemau AONR 192: 49°03'13.90"N  11°46'39.50"E
    { datum: "31.05.2026", ort: "Hemau", km: 426, lat: 49.0539, lon: 11.7776 },
    { datum: "07.06.2026", ort: "Erlangen", km: 343, lat: 49.6411, lon: 11.0379 },
    { datum: "14.06.2026", ort: "Hemau", km: 426, lat: 49.0539, lon: 11.7776 },
    // Vilshofen AONR 277: 48°39'32.60"N  13°11'23.70"E
    { datum: "21.06.2026", ort: "Vilshofen", km: 534, lat: 48.6590, lon: 13.1899 },
    { datum: "28.06.2026", ort: "Hemau", km: 426, lat: 49.0539, lon: 11.7776 },
    // Passau AONR 220: 48°13'03.00"N  13°25'25.00"E
    { datum: "05.07.2026", ort: "Passau", km: 549, lat: 48.2175, lon: 13.4236 },
    { datum: "12.07.2026", ort: "Erlangen", km: 343, lat: 49.6411, lon: 11.0379 },
    { datum: "19.07.2026", ort: "Hemau", km: 426, lat: 49.0539, lon: 11.7776 },
    // Marburg AONR 176: 50°50'01.80"N  8°46'09.60"E
    { datum: "02.08.2026", ort: "Marburg", km: 135, lat: 50.8338, lon: 8.7693 },
    // Butzbach AONR 46: 50°25'38.70"N  8°40'48.90"E
    { datum: "09.08.2026", ort: "Butzbach", km: 160, lat: 50.4274, lon: 8.6803 },
    // Gelnhausen AONR 94: 50°12'14.50"N  9°09'29.50"E
    { datum: "16.08.2026", ort: "Gelnhausen", km: 201, lat: 50.2040, lon: 9.1582 },
    { datum: "23.08.2026", ort: "Wertheim", km: 254, lat: 49.7560, lon: 9.4929 },
    // Würzburg AONR 312: 49°44'16.20"N  9°56'04.60"E
    { datum: "30.08.2026", ort: "Wuerzburg", km: 277, lat: 49.7378, lon: 9.9346 },
    // Höchstadt a.d.Aisch AONR 133: 49°41'58.80"N  10°48'17.10"E
    { datum: "06.09.2026", ort: "Hochstadt a.d.Aisch", km: 326, lat: 49.6997, lon: 10.8047 },
    { datum: "13.09.2026", ort: "Hochstadt a.d.Aisch", km: 326, lat: 49.6997, lon: 10.8047 }
];

// --- Ring-Normalisierung ---
// Entfernt alle Leerzeichen und Bindestriche für internen Vergleich
function normalizeRing(ring) {
    // Leerzeichen + Bindestriche entfernen; trailing W (Weibchen) ebenfalls ignorieren
    // damit "9084-25-0017" und "9084-25-0017W" als identisch erkannt werden.
    return String(ring).replace(/[\s\-]/g, '').replace(/W$/i, '');
}
// Formatiert eine rohe/normalisierte Ringnummer als Anzeige-Format mit Bindestrichen
// Erkennt Muster: 4-stellige Verbandsnummer + 2-stelliges Jahr + 3-5-stellige Taubennummer
function formatRingDisplay(raw) {
    // Zuerst normalisieren
    const n = normalizeRing(raw);
    // Muster: 3-5 Ziffern (Verband) + 2 Ziffern (Jahr) + 3-5 Ziffern/Buchstaben (Tauben-Nr)
    const m = n.match(/^(\d{3,5})(\d{2})(\d{3,5}[A-Z]?)$/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return n; // Fallback: normalisiert ohne Bindestriche
}

// --- myPigeons aus Rohdaten rekonstruieren ---
// Leert myPigeons komplett und sammelt alle Ringnummern aus allen Flügen neu.
// So verhindern wir, dass sich veraltete oder duplizierte Einträge ansammeln.
function rebuildMyPigeons() {
    const seen = new Set();
    const result = [];
    appData.flights.forEach(f => {
        (f.pigeons || []).forEach(p => {
            if (!p.ringNumber) return;
            const norm = normalizeRing(p.ringNumber);
            if (!seen.has(norm)) {
                seen.add(norm);
                result.push(p.ringNumber); // Anzeige-Format (mit Bindestrichen)
            }
        });
    });
    appData.myPigeons = result;
    console.log('[rebuildMyPigeons] Rekonstruiert:', result.length, 'Tauben aus', appData.flights.length, 'Flügen');
}

// --- Datenisolation beim Züchter-Wechsel ---
// Löscht ALLE RiRo-Flüge und UI-Inhalte komplett. Kein Datenmüll von alten Züchtern!
function clearAllBreederData() {
    // 1. RiRo-Flüge aus appData entfernen (manuelle + hist_-Flüge bleiben erhalten)
    const manualCount = appData.flights.filter(f => !f.id?.startsWith('riro_')).length;
    // hist_YEAR_ Prefix = historisch eingefroren → darf NICHT gelöscht werden!
    appData.flights = appData.flights.filter(f => !f.id || !f.id.startsWith('riro_') || f.id.startsWith('hist_'));
    appData.myPigeons = [];
    console.log('[clearAllBreederData] Daten geleert. Manuelle/Hist-Flüge behalten:', manualCount);

    // 2. Tauben-History leeren
    const phBody = document.getElementById('pigeon-history-body');
    if (phBody) phBody.innerHTML = '';
    const phContainer = document.getElementById('pigeon-history-container');
    if (phContainer) phContainer.style.display = 'none';
    const phSelector = document.getElementById('pigeon-history-selector');
    if (phSelector) phSelector.innerHTML = '<option value="">Bitte Taube wählen...</option>';

    // 3. Gesamt-Tabelle leeren
    const gesamtBody = document.getElementById('gesamt-table-body');
    if (gesamtBody) gesamtBody.innerHTML = '';
    const gesamtSummary = document.getElementById('gesamt-summary');
    if (gesamtSummary) gesamtSummary.textContent = '';

    // 4. Chart zerstören
    if (asPointsChartInstance) {
        asPointsChartInstance.destroy();
        asPointsChartInstance = null;
    }

    // 5. Pigeon Extractor zurücksetzen
    const extractorDiv = document.getElementById('pigeon-extractor-status');
    if (extractorDiv) extractorDiv.style.display = 'none';
    const extractorCnt = document.getElementById('extractor-count');
    if (extractorCnt) extractorCnt.textContent = '0';

    // 6. Flug-Selector zurücksetzen
    const flightSel = document.getElementById('flight-selector');
    if (flightSel) {
        flightSel.innerHTML = '<option value="">Bitte Flug wählen...</option>';
        const fd = document.getElementById('flight-details');
        if (fd) fd.style.display = 'none';
        const ps = document.getElementById('pigeon-sections');
        if (ps) ps.style.display = 'none';
    }
}

// State
let appData = { flights: [], currentFlightId: null, myPigeons: [] };
let asPointsChartInstance = null;

// --- DOM Elements ---
const flightSelector = document.getElementById('flight-selector');
const syncRiroBtn = document.getElementById('sync-riro-btn');
const newFlightBtn = document.getElementById('new-flight-btn');
const deleteFlightBtn = document.getElementById('delete-flight-btn');
const flightDetailsDiv = document.getElementById('flight-details');
const pigeonSectionsDiv = document.getElementById('pigeon-sections');
const flightNameInput = document.getElementById('flight-name');
const releaseLatInput = document.getElementById('release-lat');
const releaseLonInput = document.getElementById('release-lon');
const releaseTimeInput = document.getElementById('release-time');
const releaseWeatherInput = document.getElementById('release-weather');
const homeWeatherInput = document.getElementById('home-weather');
const calcDistanceSpan = document.getElementById('calc-distance');
const arrivalForm = document.getElementById('arrival-form');    // kann null sein (entfernt)
const tableBody = document.getElementById('table-body');       // kann null sein (entfernt)
const exportBtn = document.getElementById('export-btn');       // kann null sein (entfernt)
const statusBadge = document.getElementById('connection-status');
const notificationOverlay = document.getElementById('notification-overlay');
const closeNotificationBtn = document.getElementById('close-notification');
const pigeonHistorySelector = document.getElementById('pigeon-history-selector');
const pigeonHistoryContainer = document.getElementById('pigeon-history-container');
const pigeonHistoryBody = document.getElementById('pigeon-history-body');
const pigeonHistorySummary = document.getElementById('pigeon-history-summary');
const archiveSeasonBtn = document.getElementById('archive-season-btn');

// App starten sobald DOM bereit ist + Splash Screen
document.addEventListener('DOMContentLoaded', async () => {
    const splashStart = Date.now();
    await loadData();
    // Splash mindestens 800ms zeigen, dann sanft ausblenden
    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, 800 - elapsed);
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 600);
        }
        // Auto-Sync: Wenn ein Default-Züchter voreingestellt ist und noch
        // keine RiRo-Flüge geladen sind, automatisch im Hintergrund synchronisieren.
        // Der manuelle "RiRo Sync"-Button bleibt weiterhin verfügbar.
        const hasRiroFlights = appData.flights.some(f => f.id && f.id.startsWith('riro_'));
        if (ACTIVE_BREEDER && !hasRiroFlights) {
            console.log('[Auto-Start] Default-Züchter erkannt, keine RiRo-Daten → starte Auto-Sync…');
            setTimeout(() => autoSync(), 500);
        }
        // Freitag-Freeze: Prüfung beim Start + alle 5 Minuten
        setTimeout(() => { if (typeof checkFridayFreeze === 'function') checkFridayFreeze(); }, 3000);
    }, remaining);
});

// --- PWA + Auto-Update ---
const APP_VERSION = '2026.05.15.1';
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('sw.js');
            // Sofort nach Updates suchen
            reg.update();
            // Wenn ein neuer SW bereitsteht, automatisch aktivieren
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('[SW] Neue Version aktiviert, lade neu...');
                        }
                    });
                }
            });
        } catch (e) { console.warn('SW-Registrierung fehlgeschlagen:', e); }
    });
    // Wenn der Controller wechselt (neuer SW übernimmt), Seite neu laden
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            console.log('[SW] Controller gewechselt → Seite wird neu geladen');
            window.location.reload();
        }
    });
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
function updateOnlineStatus() {
    if (navigator.onLine) { statusBadge.textContent = 'Online'; statusBadge.className = 'status-badge online'; }
    else { statusBadge.textContent = 'Offline'; statusBadge.className = 'status-badge offline'; }
}
updateOnlineStatus();

// --- Core Calculations ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180, phi2 = lat2 * Math.PI / 180;
    const dPhi = (lat2 - lat1) * Math.PI / 180, dLam = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateSpeed(distMeters, releaseTimeStr, arrivalTimeStr) {
    if (!distMeters || !releaseTimeStr || !arrivalTimeStr) return 0;
    const rel = new Date(releaseTimeStr);
    const [h, m, s] = arrivalTimeStr.split(':');
    const arr = new Date(rel);
    arr.setHours(+h, +m, +(s || 0));
    if (arr < rel) arr.setDate(arr.getDate() + 1);
    const mins = (arr - rel) / 60000;
    return mins <= 0 ? 0 : distMeters / mins;
}

function getWindDirection(deg) {
    if (deg == null) return '';
    return ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

// --- Aero-Windvektor-Berechnung ---
// Berechnet den effektiven Windeinfluss auf die Flugstrecke.
// releaseLat/Lon: Auflassort, homeLat/Lon: Schlag
// windSpeedKmh: Windgeschwindigkeit in km/h
// windDirDeg: Richtung, AUS der der Wind kommt (meteorologisch, 0°=N)
// Gibt { wEff, wSide, flightBearing, alpha, windType } zurück (alle in m/min)
function calcWindEffect(releaseLat, releaseLon, homeLat, homeLon, windSpeedKmh, windDirDeg) {
    const toRad = d => d * Math.PI / 180;
    // 1) Flugrichtung (Bearing: Auflass → Heim)
    const dLon = toRad(homeLon - releaseLon);
    const y = Math.sin(dLon) * Math.cos(toRad(homeLat));
    const x = Math.cos(toRad(releaseLat)) * Math.sin(toRad(homeLat))
        - Math.sin(toRad(releaseLat)) * Math.cos(toRad(homeLat)) * Math.cos(dLon);
    const flightBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    // 2) Differenzwinkel α (Wind kommt AUS windDirDeg → bläst NACH windDirDeg+180)
    const windToDir = (windDirDeg + 180) % 360;
    let alpha = Math.abs(flightBearing - windToDir);
    if (alpha > 180) alpha = 360 - alpha;
    const alphaRad = alpha * Math.PI / 180;

    // 3) Effektive Windkomponente parallel zur Flugrichtung (m/min)
    //    Positiv = Rückenwind, Negativ = Gegenwind
    const wEff = windSpeedKmh * Math.cos(alphaRad) * (1000 / 60);

    // 4) Seitenwindkomponente (m/min) – immer positiv
    const wSide = Math.abs(windSpeedKmh * Math.sin(alphaRad) * (1000 / 60));

    // 5) Windtyp bestimmen
    let windType = 'Seitenwind';
    if (alpha < 45) windType = 'Rückenwind';
    else if (alpha > 135) windType = 'Gegenwind';

    return { wEff, wSide, flightBearing, alpha, windType };
}


// =============================================================
// MODULE: 3-ZONEN-FLUGKORRIDOR-RADAR
// Teilt die Flugstrecke in START/MITTE/ZIEL auf,
// berechnet zeitliche Interpolation und lädt passendes Wetter.
// =============================================================

async function render3ZoneWeather(entry, releaseHour) {
    const zone3Container = document.getElementById('zone3-container');
    const zone3Grid = document.getElementById('zone3-grid');
    if (!zone3Container || !zone3Grid) return;

    const startLat = entry.lat, startLon = entry.lon;
    const endLat = HOME_LAT, endLon = HOME_LON;
    const midLat = (startLat + endLat) / 2;
    const midLon = (startLon + endLon) / 2;
    const distM = calculateDistance(startLat, startLon, endLat, endLon);

    // Geschätzte Flugzeit (Basis 1300 m/min ≈ 78 km/h)
    const vEst = 1300; // m/min
    const totalMinutes = distM / vEst;
    const halfMinutes = totalMinutes / 2;

    const startHour = releaseHour || 9;
    const midHour = Math.min(23, Math.round(startHour + halfMinutes / 60));
    const endHour = Math.min(23, Math.round(startHour + totalMinutes / 60));

    // Datum bestimmen (aus entry oder heute)
    let isPast = false, isoDate = '';
    if (entry.datum) {
        const [dd, mm, yyyy] = entry.datum.split('.').map(Number);
        const flugDate = new Date(yyyy, mm - 1, dd);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        isPast = flugDate < today;
        isoDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }

    const zones = [
        { label: 'START', name: entry.ort || 'Auflassort', lat: startLat, lon: startLon, hour: startHour },
        { label: 'MITTE', name: `${midLat.toFixed(2)}°N ${midLon.toFixed(2)}°E`, lat: midLat, lon: midLon, hour: midHour },
        { label: 'ZIEL', name: ACTIVE_BREEDER?.name || 'Heimat', lat: endLat, lon: endLon, hour: endHour }
    ];

    // Reverse-Geocoding für Mittelpunkt (Stadtnamen)
    try {
        const gResp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${midLat}&lon=${midLon}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'de' } });
        const gData = await gResp.json();
        const city = gData.address?.city || gData.address?.town || gData.address?.village || gData.address?.county || '';
        if (city) zones[1].name = city;
    } catch (e) { /* keep coordinate name */ }

    // Wetter laden (parallel, 3 Zonen)
    const weatherPromises = zones.map(async z => {
        try {
            let w;
            if (isPast && isoDate) {
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${z.lat}&longitude=${z.lon}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (data.hourly && data.hourly.time) {
                    const idx = Math.min(z.hour, data.hourly.time.length - 1);
                    w = {
                        temperature_2m: data.hourly.temperature_2m[idx],
                        windspeed_10m: data.hourly.windspeed_10m[idx],
                        winddirection_10m: data.hourly.winddirection_10m[idx],
                        precipitation: data.hourly.precipitation ? data.hourly.precipitation[idx] : 0,
                        weathercode: data.hourly.weathercode ? data.hourly.weathercode[idx] : null
                    };
                }
            } else {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lon}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode&forecast_days=2`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (data.hourly && data.hourly.time) {
                    // Finde die Stunde die am nächsten am Ziel-Zeitpunkt liegt
                    const targetStr = z.hour < 10 ? `T0${z.hour}:00` : `T${z.hour}:00`;
                    let idx = data.hourly.time.findIndex(t => t.includes(targetStr));
                    if (idx < 0) idx = Math.min(z.hour, data.hourly.time.length - 1);
                    w = {
                        temperature_2m: data.hourly.temperature_2m[idx],
                        windspeed_10m: data.hourly.windspeed_10m[idx],
                        winddirection_10m: data.hourly.winddirection_10m[idx],
                        precipitation: data.hourly.precipitation ? data.hourly.precipitation[idx] : 0,
                        weathercode: data.hourly.weathercode ? data.hourly.weathercode[idx] : null
                    };
                }
            }
            z.weather = w || null;
        } catch (e) {
            z.weather = null;
        }
    });
    await Promise.allSettled(weatherPromises);

    // 3-Zonen-Grid rendern
    zone3Grid.innerHTML = '';
    zones.forEach((z, i) => {
        if (i > 0) {
            const arrow = document.createElement('div');
            arrow.className = 'zone3-arrow';
            arrow.innerHTML = '→';
            zone3Grid.appendChild(arrow);
        }

        const card = document.createElement('div');
        card.className = 'zone3-card';
        const w = z.weather;
        const temp = w ? `${Math.round(w.temperature_2m)}°C` : '—';
        const windSpeed = w ? Math.round(w.windspeed_10m) : 0;
        const windDir = w ? getWindDirection(w.winddirection_10m) : '—';
        const rain = w ? (w.precipitation || 0) : 0;
        const timeStr = `${String(z.hour).padStart(2, '0')}:00`;

        // Warnung: Regen > 0.2mm oder Wind > 30 km/h
        let warnHtml = '';
        const hasWarn = (rain > 0.2) || (windSpeed > 30);
        if (hasWarn) {
            card.classList.add('zone-warn');
            if (rain > 0.2) warnHtml += `<div class="zone3-warn-tag">🌧 ${rain.toFixed(1)}mm Regen</div>`;
            if (windSpeed > 30) warnHtml += `<div class="zone3-warn-tag">💨 ${windSpeed} km/h!</div>`;
        }

        // Windeffekt für diese Zone berechnen
        let aeroHtml = '';
        if (w && w.winddirection_10m != null) {
            const aero = calcWindEffect(startLat, startLon, endLat, endLon, windSpeed, w.winddirection_10m);
            const net = aero.wEff - (aero.wSide * 0.1);
            const sign = net >= 0 ? '+' : '';
            const color = net > 20 ? '#39ff14' : net < -20 ? '#ff4444' : 'var(--gold)';
            aeroHtml = `<div style="font-size:0.65rem;margin-top:3px;color:${color};font-weight:600;">${sign}${net.toFixed(0)} m/min</div>`;
        }

        card.innerHTML = `
            <div class="zone3-label">${z.label}</div>
            <div class="zone3-name">${z.name}</div>
            <div class="zone3-temp">${temp}</div>
            <div class="zone3-wind">${windSpeed} km/h ${windDir} ${w && w.winddirection_10m != null ? '<span style="display:inline-block;color:#39ff14;font-size:0.9rem;transform:rotate(' + w.winddirection_10m + 'deg);">↓</span>' : ''}</div>
            ${aeroHtml}
            ${warnHtml}
            <div class="zone3-time">${isPast ? '📜' : '🔴'} ${timeStr}</div>`;
        zone3Grid.appendChild(card);
    });

    zone3Container.style.display = 'block';
    console.log(`[3-Zonen] Gerendert: ${zones.map(z => z.name).join(' → ')}`);
}


// =============================================================
// MODULE: FORMKURVEN-RADAR (WBI-Trend-Analyse)
// Berechnet den WBI-Trend über die letzten 3-5 Flüge
// und klassifiziert die aktuelle Formkurve der Taube.
// =============================================================

function calcFormRadar(ring) {
    const normRing = normalizeRing(ring);
    const riroFlights = appData.flights.filter(f => f.id && f.id.startsWith('riro_'));

    // WBI-Werte für die letzten Flüge sammeln
    const wbiHistory = [];
    riroFlights.forEach(f => {
        const p = f.pigeons ? f.pigeons.find(x => normalizeRing(x.ringNumber) === normRing) : null;
        if (!p) return; // Taube hat nicht teilgenommen
        const speed = calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime);
        if (speed <= 0) return;

        let wbi = speed; // Default: WBI = Speed wenn keine Winddaten
        if (f.releaseLat && f.releaseLon && f.weather) {
            const wSpeed = f.weather.windSpeed || 0;
            const wDir = f.weather.windDir || 0;
            if (wSpeed > 0) {
                const aero = calcWindEffect(f.releaseLat, f.releaseLon, HOME_LAT, HOME_LON, wSpeed, wDir);
                const windBoost = aero.wEff - (aero.wSide * 0.1);
                wbi = speed - windBoost;
            }
        }
        wbiHistory.push({ wbi, speed, flightName: f.name });
    });

    if (wbiHistory.length < 2) {
        return { type: 'insufficient', label: 'Zu wenig Daten', icon: '❓', cssClass: 'stabil', detail: 'Mindestens 2 Flüge benötigt', wbiHistory };
    }

    // Letzte 3-5 Flüge für Trendberechnung
    const recent = wbiHistory.slice(-Math.min(5, wbiHistory.length));

    // Lineare Regression (Steigung der WBI-Werte)
    const n = recent.length;
    const xMean = (n - 1) / 2; // 0, 1, 2, ... → Mittelwert
    const yMean = recent.reduce((s, r) => s + r.wbi, 0) / n;
    let num = 0, den = 0;
    recent.forEach((r, i) => {
        num += (i - xMean) * (r.wbi - yMean);
        den += (i - xMean) ** 2;
    });
    const slope = den !== 0 ? num / den : 0; // WBI-Änderung pro Flug

    // Durchschnittliches WBI-Niveau
    const avgWBI = yMean;
    const lastWBI = recent[recent.length - 1].wbi;

    // Klassifizierung
    let type, label, icon, cssClass, detail;

    if (slope > 15 && lastWBI > avgWBI) {
        // Steil steigender WBI + hohes Niveau
        type = 'spitze'; label = 'Spitzenform'; icon = '🔥'; cssClass = 'spitze';
        detail = `WBI steigt um ${slope.toFixed(0)} m/min pro Flug | Niveau: ${lastWBI.toFixed(0)} m/min`;
    } else if (slope > 8) {
        // Steigender WBI
        type = 'steiger'; label = 'Stiller Aufsteiger'; icon = '📈'; cssClass = 'steiger';
        detail = `WBI steigt um ${slope.toFixed(0)} m/min pro Flug | Aktuell: ${lastWBI.toFixed(0)} m/min`;
    } else if (slope < -15) {
        // Stark fallender WBI
        type = 'warnung'; label = 'Form-Warnung'; icon = '📉'; cssClass = 'warnung';
        detail = `WBI fällt um ${Math.abs(slope).toFixed(0)} m/min pro Flug | Aktuell: ${lastWBI.toFixed(0)} m/min`;
    } else {
        // Stabil
        type = 'stabil'; label = 'Stabile Form'; icon = '➡️'; cssClass = 'stabil';
        detail = `WBI stabil bei ∅ ${avgWBI.toFixed(0)} m/min (Trend: ${slope >= 0 ? '+' : ''}${slope.toFixed(0)}/Flug)`;
    }

    return { type, label, icon, cssClass, detail, slope, avgWBI, lastWBI, wbiHistory: recent };
}

function renderFormRadar(ring) {
    const box = document.getElementById('form-radar-box');
    const badge = document.getElementById('form-radar-badge');
    const detail = document.getElementById('form-radar-detail');
    if (!box || !badge) return;

    if (!ring) { box.style.display = 'none'; return; }

    const radar = calcFormRadar(ring);
    badge.innerHTML = `<span class="form-badge ${radar.cssClass}">${radar.icon} ${radar.label}</span>`;
    if (detail) detail.textContent = radar.detail;
    box.style.display = 'block';
}


// --- ISO Week Number ---
function getISOWeek(datumStr) {
    const [d, m, y] = datumStr.split('.').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const jan1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt - jan1) / 86400000) + 1) / 7);
}

// --- Sync Status UI ---
function showSyncStatus(msg, type = 'info') {
    const el = document.getElementById('sync-status');
    if (!el) return;
    const bg = { info: 'rgba(59,130,246,0.15)', success: 'rgba(16,185,129,0.15)', error: 'rgba(239,68,68,0.15)' };
    const brd = { info: '#3b82f6', success: '#10b981', error: '#ef4444' };
    el.innerHTML = msg;
    el.style.cssText = `display:block;padding:8px 12px;border-radius:6px;font-size:0.84rem;color:white;background:${bg[type] || bg.info};border:1px solid ${brd[type] || brd.info};margin-top:10px;`;
}

// --- RiRo Pigeon Parser (RV-Altr Preisliste) ---
// Das RiRo-Format ist KEIN HTML-Table, sondern <br />-getrennter Text.
// Debug-Log: nur Console (Debug-Textfeld entfernt fuer End-User)
const _debugLines = [];
function debugLog(msg) { console.log(msg); _debugLines.push(msg); }
function flushDebugLog() { /* UI-Log entfernt - nur Console */ }
function clearDebugLog() { _debugLines.length = 0; }

// --- Toast-System (dezente Benachrichtigungen) ---
function showToast(msg, type = 'info', durationMs = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = { info: '#3b82f6', success: '#10b981', error: '#ef4444', warn: '#f59e0b' };
    const toast = document.createElement('div');
    toast.style.cssText = `
        background:${colors[type] || colors.info}; color:white; padding:10px 20px;
        border-radius:10px; font-size:0.85rem; font-weight:500;
        box-shadow:0 4px 20px rgba(0,0,0,0.4); pointer-events:auto;
        opacity:0; transform:translateY(20px); transition:all 0.3s ease;
        max-width:90vw; text-align:center;
    `;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, durationMs);
}

// =============================================================
// DYNAMISCHER ZUECHTER-IMPORT VON RIRO
// Laedt Zuechter-Stammdaten aus einer Preisliste, wenn fuer eine RV
// noch keine lokalen Daten vorhanden sind.
// =============================================================
async function fetchMembersFromStammdaten(rvId) {
    try {
        console.log(`[fetchMembers] Lade Stammdaten-Mitglieder für RV ${rvId}...`);
        const resp = await fetch(`/api/riro-stammdaten-members?rv=${rvId}`);
        if (!resp.ok) {
            console.warn(`[fetchMembers] HTTP ${resp.status} für RV ${rvId}`);
            return [];
        }
        const data = await resp.json();
        if (!data.success || !data.zuechter || !data.zuechter.length) {
            console.warn(`[fetchMembers] Keine Züchter für RV ${rvId} gefunden.`);
            return [];
        }

        console.log(`[fetchMembers] ${data.zuechter.length} Züchter, ${data.vereine.length} Vereine für RV ${rvId}`);

        // In ALL_RV_MEMBERS-Format umwandeln
        return data.zuechter.map(z => ({
            rvId: rvId,
            persNr: z.persNr,
            name: z.name,
            verein: z.verein,
            vereinName: z.vereinName,
            latRiro: z.latRiro || '000000,0',
            lonRiro: z.lonRiro || '000000,0',
            dvNr: z.dvNr || ''
        }));
    } catch (err) {
        console.error('[fetchMembers] Fehler:', err);
        return [];
    }
}

// =============================================================
// PRICE LIST IS LAW – Prüft ob heute im Do-Di-Fenster liegt
// Falls ja: Reiseplaneintrag wird durch Preislisten-Daten überschrieben
// =============================================================
function isPriceListWindow() {
    const now = new Date();
    const day = now.getDay(); // 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
    // Zeitfenster Do (4) bis Di (2) = Do, Fr, Sa, So, Mo, Di
    return day === 4 || day === 5 || day === 6 || day === 0 || day === 1 || day === 2;
}

// Extrahiert Auflass-Metadaten aus RiRo-HTML-Header
function extractRiRoFlightMeta(html) {
    const meta = {};
    // Datum: "26.04.26" oder "26.04.2026"
    const datumM = html.match(/VOM\s+(\d{2}\.\d{2}\.(?:\d{2}|\d{4}))/i);
    if (datumM) {
        const raw = datumM[1];
        const parts = raw.split('.');
        if (parts[2].length === 2) parts[2] = '20' + parts[2];
        meta.datum = parts.join('.');
    }
    // Auflassort aus Zeile "WETTFLUGBERICHT VOM DD.MM.JJ  ORT"
    const ortM = html.match(/WETTFLUGBERICHT\s+VOM\s+\d{2}\.\d{2}\.\d{2,4}\s+([A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s]+?)(?:\s+LISTE|\s*_)/i);
    if (ortM) meta.ort = ortM[1].trim();
    // Auflass-Zeit
    const zeitM = html.match(/AUFLASS\s+ERFOLGTE[^*]*\*\s*am\s+\S+\s+um\s+(\d{2}[.:]\d{2})/i);
    if (zeitM) meta.zeit = zeitM[1].replace('.', ':');
    // Koordinaten Auflassort
    const coordM = html.match(/Koordinaten\s+B\s*([\d,]+)\s+L\s*([\d,]+)/i);
    if (coordM) {
        meta.releaseLat = convertRiRoCoords(coordM[1]);
        meta.releaseLon = convertRiRoCoords(coordM[2]);
    }
    // Mittlere Entfernung
    const kmM = html.match(/MITTLERE ENTFERNUNG\s*\*\s*(\d+)\s*Kilometer/i);
    if (kmM) meta.km = parseInt(kmM[1]);
    return meta;
}

// =============================================================
// EXTRAHIERT METADATEN AUS DER WETTFLUGÜBERSICHT (ARCHIV-HTML)
// =============================================================
function extractArchivRowMeta(html, origrvnr) {
    const meta = { ort: '', kat: 'Altr', rawKat: '' };
    const trRegex = new RegExp(`<tr[^>]*>([\\s\\S]*?origrvnr=${origrvnr}[\\s\\S]*?)<\\/tr>`, 'i');
    const trMatch = html.match(trRegex);
    if (trMatch) {
        const tds = [...trMatch[1].matchAll(/<td[^>]*>(.*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
        if (tds.length >= 5) {
            meta.rawKat = tds[2] || '';
            meta.ort = tds[4] || '';
            
            const k = meta.rawKat.toLowerCase();
            if (k.includes('jung')) {
                meta.kat = 'Jung';
            } else if (k.includes('altr') || k.includes('alt')) {
                meta.kat = 'Altr';
            } else if (k.includes('jähr')) {
                meta.kat = 'Jähr';
            } else if (k.includes('herbst')) {
                meta.kat = 'Herbst';
            } else {
                const textOnly = meta.rawKat.replace(/[\d\s]+/, '').trim();
                if (textOnly) meta.kat = textOnly.charAt(0).toUpperCase() + textOnly.slice(1);
            }
        }
    }
    return meta;
}

// =============================================================
// PIGEON EXTRACTOR – sammelt ALLE Ringnummern des aktiven Züchters
// aus dem RiRo-HTML einer Preisliste (unabhängig vom Preis-Status)
// =============================================================
function extractAllPigeonRings(html) {
    const rings = new Set();
    const RING_RE = /(\d{3,5})[\s\-]+(\d{2})[\s\-]+(\d{3,5}[A-Z]?)/g;
    const breederName = ACTIVE_BREEDER.name;
    // Erstelle Such-Pattern aus dem Züchternamen (robust gegen Sonderzeichen)
    const nameFrags = breederName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/[\s,]+/).filter(f => f.length > 3);
    const namePattern = nameFrags.length > 0 ? new RegExp(nameFrags[0], 'i') : /HolperHeid/i;

    const lines = html.split(/<br\s*\/?>/i);
    for (const rawLine of lines) {
        if (!namePattern.test(rawLine)) continue;
        const clean = rawLine.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        RING_RE.lastIndex = 0;
        // Such-Bereich: Alles vor dem Züchternamen + 30 Zeichen
        const namePos = clean.search(namePattern);
        const searchArea = namePos > 0 ? clean.substring(0, namePos + 30) : clean;
        const ringM = RING_RE.exec(searchArea);
        if (ringM) {
            rings.add(ringM[1] + '-' + ringM[2] + '-' + ringM[3]);
        }
    }
    return [...rings];
}

// =============================================================
// MULTI-ZÜCHTER PARSER
// =============================================================
function parseRiroPigeons(html, flightLabel) {
    const pigeons = [];
    const flightTag = flightLabel || '?';

    // Züchter-Erkennung: dynamisch aus ACTIVE_BREEDER
    const breederName = ACTIVE_BREEDER.name;
    const nameFrags = breederName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/[\s,+&]+/).filter(f => f.length > 3);
    const primaryFrag = nameFrags[0] || 'HolperHeid';
    const nameRegex = new RegExp(primaryFrag.substring(0, Math.min(10, primaryFrag.length)), 'i');

    function isBreeder(text) {
        return nameRegex.test(text.replace(/\s/g, '').replace(/-/g, ''));
    }

    // Ringnummer: 3-5 Ziffern + 2 Ziffern + 3-5 Ziffern (optional Buchstabe)
    const RING_RE = /(\d{3,5})[\s\-]+(\d{2})[\s\-]+(\d{3,5}[A-Z]?)/;
    // Ankunftszeit: HH.MM.SS
    const TIME_RE = /\b(\d{2})\.(\d{2})\.(\d{2})\b/;
    // M/Min-ANKER: Fluggeschwindigkeit mit 3 Nachkommastellen (z.B. 1435,644)
    // Dies ist der UNFEHLBARE Filter gegen MS/Serien-Zusammenfassungen!
    const SPEED_ANCHOR_RE = /(\d+),(\d{3})\b/;

    const lines = html.split(/<br\s*\/?>/i);
    debugLog(`[Parser] ${flightTag}: ${lines.length} Zeilen gesamt`);

    // ES-FOLGEN-Marker: Tauben unterhalb dieser Linie haben KEINEN Preis erflogen
    let esFollgen = false;

    for (const rawLine of lines) {
        // --- ES FOLGEN Erkennung (vor Breeder-Filter!) ---
        // Trennlinie: "---E S   F O L G E N---" oder Varianten
        if (/E\s*S\s+F\s*O\s*L\s*G\s*E\s*N/i.test(rawLine.replace(/<[^>]*>/g, ''))) {
            esFollgen = true;
            debugLog(`[Parser] *** ES FOLGEN erkannt – ab hier keine Preise mehr ***`);
            continue;
        }

        // --- FILTER 1: Züchtername muss in der Zeile vorkommen ---
        if (!isBreeder(rawLine)) continue;

        // HTML-Tags und Entities bereinigen
        const clean = rawLine
            .replace(/<[^>]*>/g, ' ')
            .replace(/&uuml;/gi, 'ü').replace(/&auml;/gi, 'ä')
            .replace(/&ouml;/gi, 'ö').replace(/&amp;/gi, '&')
            .replace(/&szlig;/gi, 'ß').replace(/&nbsp;/gi, ' ');
        const cleanNorm = clean.replace(/\s+/g, ' ').trim();

        // --- FILTER 2: M/Min-ANKER muss vorhanden sein ---
        // MS/Serien-Zusammenfassungen haben KEINE 3-Nachkomma-Geschwindigkeit!
        // Nur echte Preislisten-Zeilen haben z.B. "1435,644"
        const speedM = SPEED_ANCHOR_RE.exec(cleanNorm);
        if (!speedM) {
            debugLog(`  [SKIP] Zeile ohne M/Min-Anker (MS/Serien?): "${cleanNorm.substring(0, 60)}..."`);
            continue;
        }

        // --- Ringnummer extrahieren ---
        // WICHTIG: Die Ringnummer muss VOR dem Züchternamen stehen,
        // damit wir nicht versehentlich eine Ringnummer eines anderen Züchters
        // auf derselben Zeile erwischen.
        const breederPos = cleanNorm.search(nameRegex);
        const ringSearchArea = cleanNorm.substring(0, breederPos + 25); // Ring steht kurz vor dem Namen
        const ringM = RING_RE.exec(ringSearchArea);
        if (!ringM) {
            debugLog(`  [SKIP] Kein Ring vor Züchter gefunden: "${ringSearchArea}"`);
            continue;
        }
        const ringDisplay = ringM[1] + '-' + ringM[2] + '-' + ringM[3];

        // Ankunftszeit
        const timeM = TIME_RE.exec(cleanNorm);
        const arrTime = timeM ? timeM[1] + ':' + timeM[2] + ':' + timeM[3] : '';

        // --- RV.PRS (max. 1 pro Flug) ---
        // RV.PRS ist die Zahl DIREKT VOR dem Orts-Kürzel (z.B. "Her/06", "DO/01", "BO/03")
        // Bei voller Zeile: "392   266   56 Her/06" → RV.PRS = 56
        // Bei leerer Reg/FG: "             260 Her/06" → RV.PRS = 260
        // WICHTIG: Orts-Kürzel können Groß/Klein sein: Her, DO, BO, GE, Boc, etc.
        let prizesRV = 0;
        let rvPlatzVal = esFollgen ? 'EF' : 0;

        if (esFollgen) {
            // Unterhalb von "ES FOLGEN" → kein Preis, kein RV-Platz
            prizesRV = 0;
            rvPlatzVal = 'EF';
            debugLog(`  [EF] ${ringDisplay}: ES-FOLGEN-Taube → rvPlatz='EF', prizesRV=0`);
        } else {
            const rvPrsMatch = cleanNorm.match(/(\d+[ab]?)\s*(?:[A-Za-zÄÖÜäöüß]{1,6}\/\d{2})/);
            if (rvPrsMatch) {
                const rvPrsVal = rvPrsMatch[1].replace(/[ab]/g, '');
                if (rvPrsVal && Number(rvPrsVal) > 0) prizesRV = 1; // Max 1!
                rvPlatzVal = Number(rvPrsVal) || 0;
                debugLog(`  [PRS] ${ringDisplay}: RV.PRS-Platz = ${rvPrsVal} (rvPlatz=${rvPlatzVal}) → Preis: ${prizesRV}`);
            } else {
                // Versuch 2: RV.PRS aus den führenden Zahlen extrahieren
                const leadingNums = cleanNorm.match(/^(\d+)\s+(\d+)\s+(\d+)\s/);
                if (leadingNums) {
                    prizesRV = 1;
                    rvPlatzVal = Number(leadingNums[3]) || 0;
                    debugLog(`  [PRS] ${ringDisplay}: RV.PRS aus Leading-Nums = ${leadingNums[3]} (rvPlatz=${rvPlatzVal}) → Preis: 1`);
                } else {
                    // Keine Platzierungsnummer am Anfang → wahrscheinlich ES-FOLGEN-Taube
                    prizesRV = 0;
                    rvPlatzVal = 'EF';
                    debugLog(`  [EF] ${ringDisplay}: Keine Platzierung am Zeilenanfang → rvPlatz='EF', prizesRV=0`);
                }
            }
        }

        // --- ASPKT -RV- über M/Min-Anker ---
        // Nach dem Speed-Wert kommen Komma-Werte: -RE-, -FG-, -RV-
        // Wir nehmen STRIKT den 3. Wert. Die ersten 2 (RE/FG) ignorieren.
        const afterSpeed = cleanNorm.substring(speedM.index + speedM[0].length);
        const aspktMatches = [];
        const aspktRe = /\*?(\d{1,3}),(\d{2})\*?/g;
        let am;
        while ((am = aspktRe.exec(afterSpeed)) !== null) {
            const rawVal = am[0].replace(/\*/g, ''); // Sternchen entfernen
            const numVal = Number(am[1] + '.' + am[2]); // Komma → Punkt → Number
            if (numVal >= 0 && numVal <= 100) {
                aspktMatches.push({ raw: rawVal, val: numVal });
            }
            if (aspktMatches.length >= 3) break; // Maximal 3 suchen
        }

        // STRIKT: Der 3. Wert = ASPKT -RV-
        let asPointsVal = 0;
        if (aspktMatches.length >= 3) {
            asPointsVal = aspktMatches[2].val; // Index 2 = dritter Wert = -RV-
        } else if (aspktMatches.length > 0) {
            // Spezialfall: Taube hat nur RV-Punkte (RE/FG leer) → letzter Wert = -RV-
            asPointsVal = aspktMatches[aspktMatches.length - 1].val;
            debugLog(`  [WARN] ${ringDisplay}: Nur ${aspktMatches.length} ASPKT-Wert(e) → nehme letzten als -RV-`);
        }

        // --- PLAUSIBILITÄTS-CHECK ---
        if (asPointsVal <= 0) {
            debugLog(`  [FEHLER] ${ringDisplay}: AS-Punkte = 0! Parser verrutscht? Zeile: "${cleanNorm.substring(0, 80)}..."`);
            // Trotzdem aufnehmen (Preis zählt), aber mit Warnung
        }

        // --- Ges/Prs. extrahieren ---
        let gesetzt = null;
        let preiseRVTotal = null;
        const gesPrsMatch = cleanNorm.match(/(\d+)\s*\/\s*\d+\s+\d+\s+(\d+)/);
        if (gesPrsMatch) {
            gesetzt = Number(gesPrsMatch[1]);
            preiseRVTotal = Number(gesPrsMatch[2]);
        }

        debugLog(`  [OK] ${ringDisplay} | Preis: ${prizesRV} | ASPKT: [${aspktMatches.map(a => a.raw).join(', ')}] → -RV- = ${asPointsVal}`);

        pigeons.push({
            id: 'p' + Math.random().toString(36).substr(2, 9),
            ringNumber: ringDisplay,
            arrivalTime: arrTime,
            prizesRV: Number(prizesRV),  // Max 1 pro Flug
            asPoints: Number(asPointsVal),
            rvPlatz: rvPlatzVal,          // Offizielle RV-Platzierung
            gesetzt: gesetzt,
            preiseRVTotal: preiseRVTotal
        });
    }

    debugLog(`[Parser] ${flightTag}: ${pigeons.length} Tauben aus Preisliste (MS/Serien ignoriert)`);
    return pigeons;
}

// --- Data ---
async function loadData() {
    try {
        const saved = await localforage.getItem(STORAGE_KEY);
        if (saved && saved.flights && saved.flights.length > 0) {
            appData = saved;
            // currentFlightId auf letzten gespeicherten Flug setzen, falls fehlt
            if (!appData.currentFlightId && appData.flights.length > 0) {
                appData.currentFlightId = appData.flights[appData.flights.length - 1].id;
            }
        } else {
            appData.flights = [];
            appData.currentFlightId = null;
            saveData();
        }
        // Rückwärtskompatibilität: historicalImports sicherstellen
        if (!appData.historicalImports) appData.historicalImports = {};

        // MIGRATION: Veraltete "KW"-Flüge bereinigen, damit der neue Parser (mit echten Orten) greifen kann
        const oldLen = appData.flights.length;
        appData.flights = appData.flights.filter(f => !/ KW\d+/i.test(f.name));
        if (appData.flights.length < oldLen) {
            // Alle Historien entsperren, damit sie neu abgerufen werden können
            appData.historicalImports = {};
            await saveData();
            console.log(`[Migration] ${oldLen - appData.flights.length} veraltete KW-Flüge gelöscht. Historie entsperrt.`);
        }

        renderFlightSelector();
        updatePigeonHistorySelector();
        updateUIForCurrentFlight();
    } catch (e) { console.error('loadData Fehler:', e); }
}
async function saveData() {
    try { await localforage.setItem(STORAGE_KEY, appData); } catch (e) { }
}
function getCurrentFlight() {
    return appData.flights.find(f => f.id === appData.currentFlightId);
}
// --- Archive ---
if (archiveSeasonBtn) {
    archiveSeasonBtn.addEventListener('click', async () => {
        if (confirm('Saison archivieren? Alle Fluege werden gesichert und die Tabelle geleert.')) {
            await localforage.setItem('archiv_' + new Date().getFullYear() + '_' + Date.now(), appData);
            appData = { flights: [], currentFlightId: null, myPigeons: [] };
            await saveData();
            alert('Saison erfolgreich archiviert!');
            window.location.reload();
        }
    });
}

// --- Top Dashboard Stats ---
function updateTopDashboardStats() {
    const elFlight = document.getElementById('stat-last-flights');
    const elPrizes = document.getElementById('stat-total-prizes');
    const elReise = document.getElementById('stat-reiseleistung');
    const elErste = document.getElementById('stat-erste-taube');
    
    if (!elFlight || !elPrizes) return;

    let flight = getCurrentFlight();
    
    if (!flight) {
        const activeFlights = appData.flights.filter(f => !f.id || !f.id.startsWith('hist_'));
        if (activeFlights.length > 0) {
            flight = activeFlights[activeFlights.length - 1];
        }
    }

    if (!flight) {
        elFlight.textContent = '--';
        elPrizes.textContent = '--';
        if (elReise) elReise.textContent = '--';
        if (elErste) elErste.textContent = '--';
        return;
    }
    
    let flightName = flight.name || 'Unbekannt';
    const match = flightName.match(/\d{2}\.\d{2}\.\d{4}\s+(.*?)\s+\(\d+/);
    if (match && match[1]) {
        flightName = match[1];
    } else {
        flightName = flightName.split('(')[0].trim();
    }
    // Kürzen falls zu lang
    if (flightName.length > 20) flightName = flightName.substring(0, 18) + '...';
    
    elFlight.innerHTML = flightName;

    let prizeCount = 0;
    let gesetzt = 0;
    let preiseTotal = 0;
    let bestPigeon = null;

    if (flight.pigeons) {
        flight.pigeons.forEach(p => {
            if (Number(p.asPoints) > 0 || Number(p.rvPlatz) > 0 || p.rvPlatz === 'EF') {
                prizeCount++;
            }
            if (p.gesetzt !== null && p.gesetzt !== undefined && gesetzt === 0) {
                gesetzt = p.gesetzt;
                preiseTotal = p.preiseRVTotal || 0;
            }
            
            // Erste Taube finden
            const platz = Number(p.rvPlatz);
            if (!isNaN(platz) && platz > 0) {
                if (!bestPigeon || platz < Number(bestPigeon.rvPlatz)) {
                    bestPigeon = p;
                }
            }
        });
    }
    
    elPrizes.textContent = prizeCount;
    
    if (elReise) {
        if (gesetzt > 0) {
            const quote = (preiseTotal / gesetzt) * 100;
            elReise.textContent = quote.toFixed(2).replace('.', ',') + ' %';
        } else {
            elReise.textContent = '--';
        }
    }
    
    if (elErste) {
        if (bestPigeon) {
            const time = bestPigeon.arrivalTime || '--:--';
            elErste.textContent = `Platz ${bestPigeon.rvPlatz} | ${time} Uhr`;
        } else {
            elErste.textContent = '--';
        }
    }
}

// --- Last Flight Modal ---
const tilePrizes = document.getElementById('tile-prizes');
const lastFlightModalOverlay = document.getElementById('last-flight-modal-overlay');
const lastFlightModalClose = document.getElementById('last-flight-modal-close');
const lastFlightModalTitle = document.getElementById('last-flight-modal-title');
const lastFlightModalSubtitle = document.getElementById('last-flight-modal-subtitle');
const lastFlightModalTbody = document.getElementById('last-flight-modal-tbody');

if (tilePrizes) {
    tilePrizes.addEventListener('click', () => {
        const activeFlights = appData.flights.filter(f => !f.id || !f.id.startsWith('hist_'));
        if (activeFlights.length === 0) {
            alert('Kein Flug gefunden!');
            return;
        }
        
        const lastFlight = activeFlights[activeFlights.length - 1];
        let flightName = lastFlight.name || 'Unbekannt';
        const match = flightName.match(/\d{2}\.\d{2}\.\d{4}\s+(.*?)\s+\(\d+/);
        if (match && match[1]) { flightName = match[1]; } 
        else { flightName = flightName.split('(')[0].trim(); }
        
        if (lastFlightModalTitle) lastFlightModalTitle.textContent = `🏆 Preise – ${flightName}`;
        if (lastFlightModalSubtitle) lastFlightModalSubtitle.textContent = lastFlight.name;
        
        let prizePigeons = [];
        if (lastFlight.pigeons) {
            prizePigeons = lastFlight.pigeons.filter(p => Number(p.asPoints) > 0 || Number(p.rvPlatz) > 0 || p.rvPlatz === 'EF');
        }
        
        prizePigeons = prizePigeons.map(p => ({
            ...p,
            speed: calculateSpeed(lastFlight.distanceMeters, lastFlight.releaseTime, p.arrivalTime)
        })).sort((a, b) => b.speed - a.speed);
        
        if (lastFlightModalTbody) {
            lastFlightModalTbody.innerHTML = '';
            if (prizePigeons.length === 0) {
                lastFlightModalTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Keine Preise auf diesem Flug</td></tr>`;
            } else {
                prizePigeons.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <span class="ring-link" data-ring="${p.ringNumber}"
                                style="color:var(--cyan);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;transition:opacity 0.15s;"
                                onmouseover="this.style.opacity='0.7'"
                                onmouseout="this.style.opacity='1'">
                                ${p.ringNumber}
                            </span>
                        </td>
                        <td>${p.arrivalTime || '--'}</td>
                        <td class="highlight">${p.speed > 0 ? p.speed.toFixed(1) : '--'}</td>
                        <td style="color:var(--gold); font-weight:700; text-align:center;">${p.rvPlatz || '--'}</td>
                        <td style="color:var(--success); font-weight:700; text-align:right;">${Number(p.asPoints) ? Number(p.asPoints).toFixed(2) : '--'}</td>
                    `;
                    lastFlightModalTbody.appendChild(tr);
                });
            }
        }
        
        if (lastFlightModalOverlay) lastFlightModalOverlay.style.display = 'flex';
    });
}

if (lastFlightModalTbody) {
    lastFlightModalTbody.addEventListener('click', e => {
        const span = e.target.closest('.ring-link');
        if (span && typeof window.openArchivPigeonModal === 'function') {
            window.openArchivPigeonModal(span.dataset.ring);
        }
    });
}

if (lastFlightModalClose) {
    lastFlightModalClose.addEventListener('click', () => {
        if (lastFlightModalOverlay) lastFlightModalOverlay.style.display = 'none';
    });
}

// --- Flight Selector ---
function renderFlightSelector() {
    updateTopDashboardStats();
    flightSelector.innerHTML = '<option value="">Bitte Flug wählen...</option>';
    // NUR aktuelle Saison (riro_) + manuelle Flüge anzeigen – hist_-Archivflüge ausblenden
    appData.flights
        .filter(f => !f.id || !f.id.startsWith('hist_'))
        .forEach(f => {
            const o = document.createElement('option');
            o.value = f.id;
            o.innerHTML = f.name || 'Unbenannter Flug';
            if (f.id === appData.currentFlightId) o.selected = true;
            flightSelector.appendChild(o);
        });
    updateUIForCurrentFlight();
}

function updateUIForCurrentFlight() {
    const flight = getCurrentFlight();
    if (flight) {
        flightDetailsDiv.style.display = 'block';
        pigeonSectionsDiv.style.display = 'block';
        flightNameInput.value = flight.name || '';
        releaseLatInput.value = flight.releaseLat || '';
        releaseLonInput.value = flight.releaseLon || '';
        releaseTimeInput.value = flight.releaseTime || '';
        // Auflass-Zeit im neuen Display-Element anzeigen
        const dispTime = document.getElementById('display-release-time');
        if (dispTime) {
            if (flight.releaseTime) {
                const d = new Date(flight.releaseTime);
                dispTime.textContent = isNaN(d) ? flight.releaseTime : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            } else { dispTime.textContent = '--:--'; }
        }
        if (flight.weather) {
            if (releaseWeatherInput) releaseWeatherInput.value = flight.weather.release || '';
            if (homeWeatherInput) homeWeatherInput.value = flight.weather.home || '';
        }
        calcDistanceSpan.textContent = flight.distanceMeters
            ? (flight.distanceMeters / 1000).toFixed(1) + ' km'
            : '-- km';

        let gesetzt = 0;
        let preise = 0;
        let quote = 0;
        
        if (flight.pigeons && flight.pigeons.length > 0) {
            const p = flight.pigeons.find(x => x.gesetzt !== null && x.gesetzt !== undefined);
            if (p) {
                gesetzt = p.gesetzt;
                preise = p.preiseRVTotal || 0;
                if (gesetzt > 0) {
                    quote = (preise / gesetzt) * 100;
                }
            }
        }
        
        const elGesetzt = document.getElementById('wf-stat-gesetzt');
        const elPreise = document.getElementById('wf-stat-preise');
        const elQuote = document.getElementById('wf-stat-quote');
        
        if (elGesetzt) elGesetzt.textContent = gesetzt;
        if (elPreise) elPreise.textContent = preise;
        if (elQuote) elQuote.textContent = gesetzt > 0 ? quote.toFixed(2).replace('.', ',') + '%' : '0%';

        renderTable();
    } else {
        flightDetailsDiv.style.display = 'none';
        pigeonSectionsDiv.style.display = 'none';
        
        const elGesetzt = document.getElementById('wf-stat-gesetzt');
        const elPreise = document.getElementById('wf-stat-preise');
        const elQuote = document.getElementById('wf-stat-quote');
        if (elGesetzt) elGesetzt.textContent = '0';
        if (elPreise) elPreise.textContent = '0';
        if (elQuote) elQuote.textContent = '0%';
    }
    updateTopDashboardStats();
}

// --- RiRo Auto-Sync (alle RVs – dynamisch über ACTIVE_RV) ---
async function autoSync() {
    if (syncRiroBtn.disabled) return;
    syncRiroBtn.textContent = '⏳ Sync...';
    syncRiroBtn.disabled = true;

    // Auto-Sync Status Indikator
    const autoSyncStatus = document.getElementById('auto-sync-status');
    const autoSyncName = document.getElementById('auto-sync-name');
    if (autoSyncStatus) { autoSyncStatus.style.display = 'block'; }
    if (autoSyncName) { autoSyncName.textContent = ACTIVE_BREEDER.name; }

    showSyncStatus('🔍 Verbinde mit RiRo-Archiv...', 'info');
    clearDebugLog();

    // --- DATENISOLATION: Alle alten RiRo-Daten löschen ---
    clearAllBreederData();
    await saveData();

    // Dynamisch aus ACTIVE_RV / getActiveRegV()
    const ORIGRVNR = ACTIVE_RV.origrvnr;  // z.B. '40306'
    const YEAR = '2026';
    const REGV = getActiveRegV().regvRiRoParam; // z.B. '403Bochum und Umgebung'
    const today = new Date();
    let imported = 0;

    debugLog(`[Sync] Start: RV ${ORIGRVNR} (${ACTIVE_RV.rvName}) | Züchter: ${ACTIVE_BREEDER.name}`);

    // Duplikat-Erkennung über Content-Hash
    const seenHtmlHashes = new Set();
    function quickHash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h * 0x01000193) >>> 0;
        }
        return h.toString(16);
    }

    // Kandidaten aus dem Reiseplan (nur vergangene Flüge)
    const candidates = REISEPLAN_2026
        .map((entry, idx) => {
            const [d, m, y] = entry.datum.split('.').map(Number);
            if (new Date(y, m - 1, d) > today) return null;
            const kw = String(getISOWeek(entry.datum)).padStart(2, '0');
            return { entry, kw, reiseplanIdx: idx };
        })
        .filter(Boolean);

    debugLog(`[Sync] ${candidates.length} vergangene Flüge im Reiseplan gefunden.`);

    for (const c of candidates) {
        const e = c.entry;
        showSyncStatus(`⏳ Flug ${c.reiseplanIdx + 1}/${candidates.length}: ${e.ort} (KW ${parseInt(c.kw)})...`, 'info');

        try {
            // SCHRITT 1: Archiv-Übersicht für diese KW laden
            const archivUrl = `https://www.bas-riro.de/Preislisten/index.php?action=showRaceResults&year=${YEAR}&kw=${c.kw}&regv=${encodeURIComponent(REGV)}`;
            debugLog(`[Sync] Schritt 1: Archiv-Übersicht KW ${parseInt(c.kw)} laden...`);

            const archivRes = await fetch('/api/proxy?url=' + encodeURIComponent(archivUrl));
            if (!archivRes.ok) {
                debugLog(`[Sync] KW ${parseInt(c.kw)}: Archiv-Seite nicht erreichbar (${archivRes.status}).`);
                continue;
            }
            const archivHtml = await archivRes.text();

            const rowMeta = extractArchivRowMeta(archivHtml, ORIGRVNR);

            // RV-Altr URL dynamisch: origrvnr=ACTIVE_RV.origrvnr
            // SICHERHEIT: Nur aktive <a href="...">-Links matchen, nicht inaktiven Klartext!
            const rvAltLinkRe = new RegExp(`<a[^>]+href="[^"]*?(showRaceResult[^"]*origrvnr=${ORIGRVNR}[^"]*showCol=4)"`, 'gi');
            const rvAltMatches = [...archivHtml.matchAll(rvAltLinkRe)];
            if (!rvAltMatches.length) {
                debugLog(`[Sync] KW ${parseInt(c.kw)} (${e.ort}): Keine aktive RV-Altr-Preisliste (Link) für RV ${ORIGRVNR} gefunden.`);
                flushDebugLog();
                continue;
            }

            const rvAltPath = rvAltMatches[0][1].replace(/&amp;/g, '&');
            const preislisteUrl = `https://www.bas-riro.de/Preislisten/index.php?action=${rvAltPath}`;

            const linrMatch = rvAltPath.match(/linr=(\d+)/);
            const flnrMatch = rvAltPath.match(/flnr=(\d+)/);
            const linr = linrMatch ? linrMatch[1] : '?';
            const flnr = flnrMatch ? flnrMatch[1] : '?';
            debugLog(`[Sync] KW ${parseInt(c.kw)}: Archiv-Lookup → linr=${linr}, flnr=${flnr}`);

            // SCHRITT 2: Tatsächliche Preisliste laden
            const res = await fetch('/api/proxy?url=' + encodeURIComponent(preislisteUrl));
            if (!res.ok) {
                debugLog(`[Sync] KW ${parseInt(c.kw)}: Preisliste nicht erreichbar (${res.status}).`);
                continue;
            }
            const html = await res.text();

            // Duplikat-Check
            const hash = quickHash(html);
            if (seenHtmlHashes.has(hash)) {
                debugLog(`[Sync] KW ${parseInt(c.kw)} (${e.ort}): DUPLIKAT (Hash ${hash}) → überspringe!`);
                flushDebugLog();
                continue;
            }
            seenHtmlHashes.add(hash);

            // PRICE LIST IS LAW: Preislisten-Metadaten extrahieren
            const plMeta = extractRiRoFlightMeta(html);
            debugLog(`[Sync] Preislisten-Meta: Datum=${plMeta.datum || '?'} Ort=${plMeta.ort || '?'} km=${plMeta.km || '?'} Zeit=${plMeta.zeit || '?'}`);

            let finalLat = e.lat, finalLon = e.lon, finalKm = e.km, finalOrt = e.ort;
            let finalDatum = e.datum;
            if (plMeta.releaseLat && plMeta.releaseLon) {
                finalLat = plMeta.releaseLat;
                finalLon = plMeta.releaseLon;
                debugLog(`[Sync] ⚖️ PRICE LIST IS LAW: Koordinaten aus Preisliste (${finalLat.toFixed(4)}, ${finalLon.toFixed(4)})`);
            }
            if (plMeta.km) finalKm = plMeta.km;
            
            // PRIORITÄT: Archiv-Übersicht (rowMeta) vor Preislisten-Meta (plMeta) für Ortsnamen! Kein KW-Fallback!
            if (rowMeta.ort && !rowMeta.ort.toUpperCase().startsWith('KW')) {
                finalOrt = rowMeta.ort;
            } else if (plMeta.ort && !plMeta.ort.toUpperCase().startsWith('KW')) {
                finalOrt = plMeta.ort;
            } else if (e.ort && !e.ort.toUpperCase().startsWith('KW')) {
                finalOrt = e.ort;
            } else {
                finalOrt = 'Unbekannter Ort';
            }
            
            if (plMeta.datum) finalDatum = plMeta.datum;

            const plZeit = plMeta.zeit || '09:20';
            const dateParts = finalDatum.split('.');
            const relTime = dateParts.length === 3
                ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${plZeit}`
                : `${YEAR}-${e.datum.split('.')[1]}-${e.datum.split('.')[0]}T${plZeit}`;

            const rvSlash = ORIGRVNR.replace(/^(\d{3})(\d{2})$/, '$1/$2');
            const flugHeaderMatch = html.match(new RegExp(rvSlash.replace('/', '\\/') + '[^<]*Flug\\s*(\\d+)-(\\d+)\\s*km'));
            const realFlugNr = flugHeaderMatch ? flugHeaderMatch[1] : flnr;
            const flightName = `${finalDatum} ${finalOrt} (${finalKm} km) – ${rowMeta.kat} [Flug ${realFlugNr}]`;
            const flightId = `riro_kw${c.kw}_f${flnr}`;

            const pigeons = parseRiroPigeons(html, flightName);
            const allRingsInFlight = extractAllPigeonRings(html);
            debugLog(`[Extractor] ${flightName}: ${allRingsInFlight.length} Ringe gefunden: ${allRingsInFlight.join(', ')}`);

            if (!pigeons.length) {
                debugLog(`[Sync] ${flightName}: Keine Tauben mit Preis gefunden, überspringe.`);
                flushDebugLog();
                continue;
            }

            const newFlight = {
                id: flightId, name: flightName,
                releaseLat: finalLat, releaseLon: finalLon, releaseTime: relTime,
                distanceMeters: calculateDistance(HOME_LAT, HOME_LON, finalLat, finalLon),
                pigeons, weather: { release: '', home: '' },
                plMeta: { isLaw: true, source: 'preisliste', allRings: allRingsInFlight }
            };

            // Wetter im Hintergrund (nicht-blockierend)
            (async () => {
                try {
                    const relDate = relTime.split('T')[0];
                    const rw = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${finalLat}&longitude=${finalLon}&start_date=${relDate}&end_date=${relDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation`)).json();
                    const rIdx = rw.hourly.time.findIndex(t => t.includes('09:00'));
                    newFlight.weather.release = rIdx >= 0 ? getWindDirection(rw.hourly.winddirection_10m[rIdx]) + ' ' + rw.hourly.temperature_2m[rIdx] + '°C' : 'k.A.';
                    // Niederschlag & Wind am Auflassort speichern
                    if (rIdx >= 0) {
                        newFlight.weather.precipitation = rw.hourly.precipitation ? rw.hourly.precipitation[rIdx] : 0;
                        newFlight.weather.windSpeed = rw.hourly.windspeed_10m ? Math.round(rw.hourly.windspeed_10m[rIdx]) : 0;
                        newFlight.weather.windDir = rw.hourly.winddirection_10m ? Math.round(rw.hourly.winddirection_10m[rIdx]) : 0;
                    }
                    const hw = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${HOME_LAT}&longitude=${HOME_LON}&start_date=${relDate}&end_date=${relDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation`)).json();
                    const hIdx = hw.hourly.time.findIndex(t => t.includes('13:00'));
                    newFlight.weather.home = hIdx >= 0 ? getWindDirection(hw.hourly.winddirection_10m[hIdx]) + ' ' + hw.hourly.temperature_2m[hIdx] + '°C' : 'k.A.';
                    // Heimat-Niederschlag addieren (Durchschnitt)
                    if (hIdx >= 0 && hw.hourly.precipitation) {
                        const homePrecip = hw.hourly.precipitation[hIdx] || 0;
                        newFlight.weather.precipitation = ((newFlight.weather.precipitation || 0) + homePrecip) / 2;
                    }
                    saveData();
                } catch (_) { }
            })();

            appData.flights.push(newFlight);
            debugLog(`[Sync] ✅ Flug importiert: ${flightId} → ${flightName} → ${pigeons.length} Tauben`);

            rebuildMyPigeons();
            appData.currentFlightId = flightId;
            await saveData();
            renderFlightSelector();
            updatePigeonHistorySelector();
            imported++;
            showSyncStatus(`✅ ${imported} Flug/Flüge importiert – letzter: ${e.ort}`, 'success');
            flushDebugLog();

        } catch (err) {
            console.warn('Sync Fehler für Flug KW', c.kw, err);
            debugLog(`[Sync] FEHLER bei KW ${parseInt(c.kw)}: ${err.message}`);
        }
    }

    // Abschluss
    if (imported > 0) {
        updateUIForCurrentFlight();
        showSyncStatus(`✅ Sync abgeschlossen: ${imported} Flüge für ${ACTIVE_BREEDER.name} importiert. ⚖️ Price List is Law aktiv.`, 'success');
    } else {
        showSyncStatus(`ℹ️ Keine neuen Preislisten für RV ${ORIGRVNR} auf RiRo gefunden.`, 'info');
    }

    syncRiroBtn.textContent = '🔄 RiRo Sync';
    syncRiroBtn.disabled = false;
    if (autoSyncStatus) autoSyncStatus.style.display = 'none';
    statusBadge.textContent = navigator.onLine ? 'Online' : 'Offline';
    debugLog(`[Sync] FERTIG: ${imported} Flüge importiert, ${appData.flights.length} Flüge gesamt`);
    flushDebugLog();
    document.dispatchEvent(new CustomEvent('riroSyncComplete'));
}

// Sync-Button: manueller Fallback → ruft dieselbe autoSync() auf
syncRiroBtn.addEventListener('click', () => autoSync());

// =============================================================
// HISTORISCHER JAHRES-SCRAPER
// Scannt KW 10–45 des angegebenen Jahres auf RiRo.
// Speichert Flüge dauerhaft als 'hist_YEAR_kwXX_fY' – werden
// NICHT von clearAllBreederData() gelöscht (eingefroren).
// =============================================================
async function syncHistoricalYear(year) {
    const importKey = `${ACTIVE_RV.origrvnr}_${year}`;

    // ── Einfrierungs-Check ───────────────────────────────────────────────────
    if (appData.historicalImports && appData.historicalImports[importKey]) {
        const meta = appData.historicalImports[importKey];
        const d = new Date(meta.importedAt).toLocaleDateString('de-DE');
        showToast(`📦 ${year}er-Archiv bereits eingefroren (importiert am ${d}). Kein erneuter Import nötig.`, 'info', 6000);
        return;
    }

    const histImportBtn = document.getElementById('hist-import-btn');
    const histImportStatus = document.getElementById('hist-import-status');
    if (histImportBtn) { histImportBtn.disabled = true; histImportBtn.textContent = `⏳ Importiere ${year}…`; }
    if (histImportStatus) histImportStatus.style.display = 'block';

    const ORIGRVNR = ACTIVE_RV.origrvnr;
    const REGV = getActiveRegV().regvRiRoParam;
    const YEAR_STR = String(year);
    let imported = 0;
    const seenHtmlHashes = new Set();

    function quickHashHist(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
        return h.toString(16);
    }

    showSyncStatus(`🗂️ Starte historischen Import ${year} für RV ${ORIGRVNR}…`, 'info');
    debugLog(`[HistSync ${year}] Start: RV ${ORIGRVNR} | RegV ${REGV} | Züchter: ${ACTIVE_BREEDER.name}`);

    // ── KW-Loop: 10–45 (Flugsaison April–September) ─────────────────────────
    const KW_START = 10, KW_END = 45;

    for (let kw = KW_START; kw <= KW_END; kw++) {
        const kwStr = String(kw).padStart(2, '0');
        if (histImportStatus) {
            histImportStatus.innerHTML = `🗂️ Scanne KW ${kw}/${KW_END} (${year}) für RV ${ORIGRVNR}…<br><small style="color:rgba(255,255,255,0.5);">${imported} Flüge bisher importiert</small>`;
        }

        try {
            // Schritt 1: Archiv-Übersicht für KW laden
            const archivUrl = `https://www.bas-riro.de/Preislisten/index.php?action=showRaceResults&year=${YEAR_STR}&kw=${kwStr}&regv=${encodeURIComponent(REGV)}`;
            const archivRes = await fetch('/api/proxy?url=' + encodeURIComponent(archivUrl));
            if (!archivRes.ok) continue;
            const archivHtml = await archivRes.text();

            const rowMeta = extractArchivRowMeta(archivHtml, ORIGRVNR);

            // RV-Altr Link finden (showCol=4)
            const rvAltLinkRe = new RegExp(`<a[^>]+href="[^"]*?(showRaceResult[^"]*origrvnr=${ORIGRVNR}[^"]*showCol=4)"`, 'gi');
            const rvAltMatches = [...archivHtml.matchAll(rvAltLinkRe)];
            if (!rvAltMatches.length) {
                debugLog(`[HistSync ${year}] KW ${kw}: Kein RV-Altr-Link für ${ORIGRVNR} → kein Flug diese KW`);
                continue;
            }

            const rvAltPath = rvAltMatches[0][1].replace(/&amp;/g, '&');
            const preislisteUrl = `https://www.bas-riro.de/Preislisten/index.php?action=${rvAltPath}`;
            const flnrMatch = rvAltPath.match(/flnr=(\d+)/);
            const flnr = flnrMatch ? flnrMatch[1] : String(kw);

            // Schritt 2: Preisliste laden
            const plRes = await fetch('/api/proxy?url=' + encodeURIComponent(preislisteUrl));
            if (!plRes.ok) continue;
            const html = await plRes.text();

            // Duplikat-Check
            const hash = quickHashHist(html);
            if (seenHtmlHashes.has(hash)) { debugLog(`[HistSync ${year}] KW ${kw}: Duplikat → skip`); continue; }
            seenHtmlHashes.add(hash);

            // Meta extrahieren
            const plMeta = extractRiRoFlightMeta(html);
            
            let ort = rowMeta.ort || plMeta.ort || '';
            if (ort.toUpperCase().startsWith('KW')) ort = '';
            if (!ort) ort = 'Unbekannter Ort';
            
            const datum = plMeta.datum || `01.01.${year}`;
            const km = plMeta.km || 0;
            const zeit = plMeta.zeit || '09:20';

            const dateParts = datum.split('.');
            const relTime = dateParts.length === 3
                ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${zeit}`
                : `${YEAR_STR}-01-01T${zeit}`;

            const lat = plMeta.releaseLat || 50.0;
            const lon = plMeta.releaseLon || 10.0;
            const flightName = `${datum} ${ort} (${km} km) – ${rowMeta.kat} ${year} [Flug ${flnr}]`;
            const flightId = `hist_${year}_kw${kwStr}_f${flnr}`;

            // Tauben parsen
            const pigeons = parseRiroPigeons(html, flightName);
            if (!pigeons.length) {
                debugLog(`[HistSync ${year}] KW ${kw} (${ort}): Keine Tauben des Züchters → skip`);
                continue;
            }

            // Flug-Objekt
            const newFlight = {
                id: flightId,
                name: flightName,
                season: year,                 // Jahres-Tag für spätere Filter
                releaseLat: lat, releaseLon: lon,
                releaseTime: relTime,
                distanceMeters: calculateDistance(HOME_LAT, HOME_LON, lat, lon),
                pigeons,
                weather: { release: '', home: '' },
                plMeta: { isLaw: true, source: 'hist-preisliste' }
            };

            // Historisches Wetter (non-blocking)
            (async () => {
                try {
                    const relDate = relTime.split('T')[0];
                    const rw = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${relDate}&end_date=${relDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m`)).json();
                    const rIdx = rw.hourly?.time?.findIndex(t => t.includes('09:00')) ?? -1;
                    if (rIdx >= 0) {
                        newFlight.weather.release = getWindDirection(rw.hourly.winddirection_10m[rIdx]) + ' ' + rw.hourly.temperature_2m[rIdx] + '°C';
                        newFlight.weather.windSpeed = Math.round(rw.hourly.windspeed_10m[rIdx]);
                        newFlight.weather.windDir = Math.round(rw.hourly.winddirection_10m[rIdx]);
                    }
                    saveData();
                } catch (_) { }
            })();

            // Flug dauerhaft einfügen (kein clearAllBreederData!)
            appData.flights.push(newFlight);
            rebuildMyPigeons();
            await saveData();
            renderFlightSelector();
            updatePigeonHistorySelector();
            imported++;
            debugLog(`[HistSync ${year}] ✅ ${flightId} → ${flightName} → ${pigeons.length} Tauben`);

        } catch (err) {
            debugLog(`[HistSync ${year}] FEHLER KW ${kw}: ${err.message}`);
        }
    }

    // ── Einfrieren ───────────────────────────────────────────────────────────
    if (!appData.historicalImports) appData.historicalImports = {};
    appData.historicalImports[importKey] = {
        importedAt: new Date().toISOString(),
        year,
        rvId: ORIGRVNR,
        breederPersNr: ACTIVE_BREEDER.persNr,
        flights: imported
    };
    await saveData();

    // UI aufräumen
    if (histImportBtn) {
        if (imported > 0) {
            histImportBtn.textContent = `✅ ${year}er eingefroren (${imported} Flüge)`;
            histImportBtn.style.background = 'rgba(16,185,129,0.15)';
            histImportBtn.style.borderColor = '#10b981';
            histImportBtn.style.color = '#34d399';
        } else {
            histImportBtn.textContent = `⚠️ Keine Daten für ${year} gefunden`;
            histImportBtn.disabled = false;
        }
    }
    if (histImportStatus) histImportStatus.style.display = 'none';

    const msg = imported > 0
        ? `✅ ${year}er-Archiv eingefroren: ${imported} Flüge für ${ACTIVE_BREEDER.name} importiert und dauerhaft gespeichert.`
        : `ℹ️ Keine Preislisten für ${year} / RV ${ORIGRVNR} gefunden. Möglicherweise zu früh im Jahr oder Daten bereits abgelaufen.`;
    showSyncStatus(msg, imported > 0 ? 'success' : 'info');
    showToast(msg, imported > 0 ? 'success' : 'warn', 7000);
    debugLog(`[HistSync ${year}] FERTIG: ${imported} Flüge importiert.`);

    if (imported > 0) updateUIForCurrentFlight();
}

// ── UI-Init: Historischer Import-Button ─────────────────────────────────────
(function initHistoricalImportUI() {
    const btn    = document.getElementById('hist-import-btn');
    const status = document.getElementById('hist-import-status');
    const label  = document.getElementById('hist-import-label');
    if (!btn) return;

    const prevYear = new Date().getFullYear() - 1;
    if (label) label.textContent = `📥 Vorjahr ${prevYear} importieren`;

    function refreshHistBtn() {
        if (!appData.historicalImports) return;
        const importKey = `${ACTIVE_RV.origrvnr}_${prevYear}`;
        const existing  = appData.historicalImports[importKey];
        if (existing) {
            const d = new Date(existing.importedAt).toLocaleDateString('de-DE');
            btn.textContent  = `✅ ${prevYear} eingefroren – ${existing.flights} Flüge (${d})`;
            btn.disabled     = true;
            btn.style.background   = 'rgba(16,185,129,0.12)';
            btn.style.borderColor  = '#10b981';
            btn.style.color        = '#34d399';
        } else {
            btn.textContent  = `📥 Vorjahr ${prevYear} importieren`;
            btn.disabled     = false;
            btn.style.background   = '';
            btn.style.borderColor  = '';
            btn.style.color        = '';
        }
    }

    // Nach loadData() ausführen (DOMContentLoaded ist zu diesem Zeitpunkt schon gelaufen)
    document.addEventListener('DOMContentLoaded', refreshHistBtn, { once: true });
    // Auch direkt (falls DOMContentLoaded schon vorbei)
    if (document.readyState !== 'loading') refreshHistBtn();
    // Bei Züchter-Wechsel aktualisieren
    document.addEventListener('riroSyncComplete', refreshHistBtn);

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        syncHistoricalYear(prevYear);
    });
})();




// --- Flight Management ---
newFlightBtn.addEventListener('click', () => {
    const id = 'flight_' + Date.now();
    appData.flights.push({ id, name: 'Neuer Flug ' + (appData.flights.length + 1), releaseLat: '', releaseLon: '', releaseTime: '', distanceMeters: 0, pigeons: [], weather: { release: '', home: '' } });
    appData.currentFlightId = id; saveData(); renderFlightSelector();
});
deleteFlightBtn.addEventListener('click', () => {
    if (confirm('Diesen Flug loeschen?')) {
        appData.flights = appData.flights.filter(f => f.id !== appData.currentFlightId);
        appData.currentFlightId = null; saveData(); renderFlightSelector();
    }
});
flightSelector.addEventListener('change', e => {
    appData.currentFlightId = e.target.value;
    saveData();
    updateUIForCurrentFlight();
    updatePigeonHistorySelector();
});

// --- Flug-Ergebnis Modal ---
(function initFlightResultsModal() {
    const resultsBtn = document.getElementById('flight-results-btn');
    const resultsOverlay = document.getElementById('flight-results-overlay');
    const resultsClose = document.getElementById('flight-results-close');
    const resultsTitle = document.getElementById('flight-results-title');
    const resultsSubtitle = document.getElementById('flight-results-subtitle');
    const resultsBody = document.getElementById('flight-results-body');
    const resultsSummary = document.getElementById('flight-results-summary');
    if (!resultsBtn || !resultsOverlay) return;

    function openFlightResults() {
        const f = getCurrentFlight();
        if (!f) { alert('Bitte zuerst einen Flug auswählen.'); return; }
        if (!f.pigeons || !f.pigeons.length) { alert('Keine Taubendaten für diesen Flug.'); return; }

        resultsTitle.textContent = '📊 ' + (f.name || 'Flugergebnis');
        resultsSubtitle.textContent = f.pigeons.length + ' Tauben | Distanz: ' +
            (f.distanceMeters ? (f.distanceMeters / 1000).toFixed(1) + ' km' : '—');

        // Geschwindigkeit berechnen und sortieren (absteigend = schnellste zuerst)
        const pigeonData = f.pigeons.map(p => {
            const speed = calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime);
            return { ...p, speed };
        }).sort((a, b) => b.speed - a.speed);

        resultsBody.innerHTML = '';
        let totalAS = 0, totalPrizes = 0;

        // Prognose-Rank-Badges: Eingefrorene Prognose für diesen Flug suchen
        const circleNums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
        let predictionMap = {}; // normalizedRing → rank (1-10)
        try {
            const arch = JSON.parse(localStorage.getItem('taubenpro_predictions_archive') || '{}');
            Object.values(arch).forEach(pred => {
                if (!pred.flugDatum || !f.name || !f.name.includes(pred.flugDatum)) return;
                pred.top10.forEach(t => { predictionMap[normalizeRing(t.ring)] = t.rank; });
            });
        } catch (e) { }

        pigeonData.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
            if (idx === 0) tr.style.background = 'rgba(255,215,0,0.08)'; // Gold für Platz 1

            const prs = Number(p.prizesRV) || 0;
            const pts = Number(p.asPoints) || 0;
            totalPrizes += prs;
            totalAS += pts;

            const speedStr = p.speed > 0 ? p.speed.toFixed(3).replace('.', ',') : '—';
            const ptsStr = pts > 0 ? pts.toFixed(2) : '—';

            // Prognose-Badge: War diese Taube in der Freitags-Top-10?
            const predRank = predictionMap[normalizeRing(p.ringNumber)];
            const predBadge = predRank ? `<span class="prediction-rank-badge" title="Freitags-Tipp Platz ${predRank}">${circleNums[predRank - 1]}</span>` : '';

            const rvDisplay = p.rvPlatz === 'EF' ? '<span style="color:rgba(255,255,255,0.3);font-size:0.7rem;">EF</span>' : (p.rvPlatz || (idx + 1));

            tr.innerHTML = `
                <td style="padding:7px 6px; text-align:center; color:rgba(255,255,255,0.5); font-size:0.78rem;">${rvDisplay}</td>
                <td style="padding:7px 6px; color:#fff; font-weight:600; font-family:'Roboto Mono',monospace; font-size:0.82rem;">
                    <span class="ring-link" data-ring="${p.ringNumber}"
                        style="color:var(--cyan);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;transition:opacity 0.15s;"
                        onmouseover="this.style.opacity='0.7'"
                        onmouseout="this.style.opacity='1'">
                        ${p.ringNumber || '?'}
                    </span>${predBadge}
                </td>
                <td style="padding:7px 6px; text-align:center; color:rgba(255,255,255,0.7);">${p.arrivalTime || '—'}</td>
                <td style="padding:7px 6px; text-align:right; color:var(--cyan); font-weight:700;">${speedStr}</td>
                <td style="padding:7px 6px; text-align:right; color:${pts > 0 ? 'var(--green)' : 'rgba(255,255,255,0.3)'}; font-weight:600;">${ptsStr}</td>
            `;
            resultsBody.appendChild(tr);
        });

        resultsSummary.textContent = `${totalAS.toFixed(2)} AS-Punkte gesamt`;
        resultsOverlay.style.display = 'block';
    }

    resultsBody.addEventListener('click', e => {
        const span = e.target.closest('.ring-link');
        if (span && typeof window.openArchivPigeonModal === 'function') {
            window.openArchivPigeonModal(span.dataset.ring);
        }
    });

    resultsBtn.addEventListener('click', openFlightResults);
    resultsClose.addEventListener('click', () => { resultsOverlay.style.display = 'none'; });
    resultsOverlay.addEventListener('click', e => { if (e.target === resultsOverlay) resultsOverlay.style.display = 'none'; });
})();

function updateCurrentFlightDetails() {
    const f = getCurrentFlight(); if (!f) return;
    f.name = flightNameInput.value;
    f.releaseLat = parseFloat(releaseLatInput.value) || '';
    f.releaseLon = parseFloat(releaseLonInput.value) || '';
    f.releaseTime = releaseTimeInput.value;
    if (!f.weather) f.weather = {};
    if (releaseWeatherInput) f.weather.release = releaseWeatherInput.value;
    if (homeWeatherInput) f.weather.home = homeWeatherInput.value;
    if (f.releaseLat && f.releaseLon) {
        f.distanceMeters = calculateDistance(HOME_LAT, HOME_LON, f.releaseLat, f.releaseLon);
        calcDistanceSpan.textContent = (f.distanceMeters / 1000).toFixed(1) + ' km';
    } else { f.distanceMeters = 0; calcDistanceSpan.textContent = '-- km'; }
    saveData();
    const opt = flightSelector.querySelector(`option[value="${f.id}"]`);
    if (opt) opt.textContent = f.name || 'Unbenannter Flug';
}
flightNameInput.addEventListener('input', updateCurrentFlightDetails);
releaseLatInput.addEventListener('input', updateCurrentFlightDetails);
releaseLonInput.addEventListener('input', updateCurrentFlightDetails);
releaseTimeInput.addEventListener('change', () => { updateCurrentFlightDetails(); renderTable(); });
if (releaseWeatherInput) releaseWeatherInput.addEventListener('input', updateCurrentFlightDetails);
if (homeWeatherInput) homeWeatherInput.addEventListener('input', updateCurrentFlightDetails);

// --- Pigeon Entry (nur wenn Form noch im DOM) ---
if (arrivalForm) {
    arrivalForm.addEventListener('submit', e => {
        e.preventDefault();
        const f = getCurrentFlight(); if (!f) return;
        if (!f.releaseTime) { alert('Bitte zuerst die Auflasszeit festlegen!'); return; }
        const ring = document.getElementById('ring-number').value;
        const arrTime = document.getElementById('arrival-time').value;
        if (f.pigeons.find(p => p.ringNumber === ring)) { alert('Taube bereits erfasst!'); return; }
        f.pigeons.push({ id: Date.now().toString(), ringNumber: ring, arrivalTime: arrTime, prizesRV: 0, asPoints: 0 });
        if (!appData.myPigeons) appData.myPigeons = [];
        if (!appData.myPigeons.includes(ring)) appData.myPigeons.push(ring);
        saveData(); renderTable();
        document.getElementById('ring-number').value = '';
        document.getElementById('arrival-time').value = '';
        document.getElementById('ring-number').focus();
    });
}

// --- Table (nur wenn tableBody im DOM) ---
function renderTable() {
    if (!tableBody) return;  // Tabelle wurde entfernt
    const f = getCurrentFlight(); tableBody.innerHTML = ''; if (!f) return;
    const fIdx = appData.flights.findIndex(x => x.id === f.id);
    const prev = appData.flights.slice(0, fIdx + 1);
    const rows = f.pigeons.map(p => {
        let totalPrizes = 0, totalAS = 0;
        const normP = normalizeRing(p.ringNumber);
        prev.forEach(fl => {
            const hp = fl.pigeons.find(x => normalizeRing(x.ringNumber) === normP);
            if (hp) {
                totalPrizes += Number(hp.prizesRV) || 0;
                totalAS += Number(hp.asPoints) || 0;
            }
        });
        return { ...p, speed: calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime), totalPrizes, totalAS };
    }).sort((a, b) => b.speed - a.speed);
    rows.slice(0, 10).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="ring-link" data-ring="${p.ringNumber}"
                    style="color:var(--cyan);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;transition:opacity 0.15s;"
                    onmouseover="this.style.opacity='0.7'"
                    onmouseout="this.style.opacity='1'">
                    ${p.ringNumber}
                </span>
            </td>
            <td>${p.arrivalTime}</td>
            <td class="highlight">${p.speed > 0 ? p.speed.toFixed(1) : '--'}</td>
            <td>${p.totalPrizes}</td>
            <td>${p.totalAS.toFixed(2)}</td>
            <td><button class="btn danger-btn" onclick="deletePigeon('${p.id}')">X</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

if (tableBody) {
    tableBody.addEventListener('click', e => {
        const span = e.target.closest('.ring-link');
        if (span && typeof window.openArchivPigeonModal === 'function') {
            window.openArchivPigeonModal(span.dataset.ring);
        }
    });
}window.deletePigeon = function (id) {
    const f = getCurrentFlight(); if (!f) return;
    f.pigeons = f.pigeons.filter(p => p.id !== id); saveData(); renderTable();
};

// --- Notifications ---
if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', () => { if (notificationOverlay) notificationOverlay.style.display = 'none'; });

// --- Excel Export (nur wenn Button vorhanden) ---
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const f = getCurrentFlight();
        if (!f || !f.pigeons.length) { alert('Keine Daten zum Exportieren.'); return; }
        const data = f.pigeons.map(p => ({
            "Ringnummer": p.ringNumber,
            "Ankunft": p.arrivalTime,
            "Geschw. m/min": calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime).toFixed(1),
            "Preise RV": p.prizesRV || 0,
            "AS-Punkte": p.asPoints
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ergebnisse');
        XLSX.writeFile(wb, `Tauben_${f.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
    });
}

// --- Taubenleistung – Dropdown befüllen (Sektion 1: Preisträger gold / Sektion 2: Archiv) ---
function updatePigeonHistorySelector() {
    if (!pigeonHistorySelector) return;
    pigeonHistorySelector.innerHTML = '<option value="">Bitte Taube wählen...</option>';

    // ── Hilfsfunktionen ──────────────────────────────────────────────────────
    function endNum(ring) {
        return (ring.split(/[-\s]/).pop() || ring).replace(/W$/i, '');
    }
    function sortByEndNum(a, b) {
        return endNum(a.display).localeCompare(endNum(b.display), undefined, { numeric: true });
    }

    // ── W-Deduplication via ringMap ──────────────────────────────────────────
    // normKey → { display, inCurrent, hasPrize }
    //   inCurrent = Taube taucht in min. einem riro_-Flug auf
    //   hasPrize  = Taube hat in min. einem riro_-Flug asPoints > 0 ODER prizesRV > 0
    const ringMap = new Map();

    function registerRing(ring, inCurrent, prize) {
        if (!ring) return;
        const norm = normalizeRing(ring);
        if (!ringMap.has(norm)) ringMap.set(norm, { display: ring, inCurrent: false, hasPrize: false });
        const e = ringMap.get(norm);
        if (/W$/i.test(ring.split(/[-\s]/).pop())) e.display = ring; // W-Variante bevorzugen
        if (inCurrent) e.inCurrent = true;
        if (prize)     e.hasPrize  = true;
    }

    // Aktuelle Saison – riro_-Flüge
    appData.flights
        .filter(f => f.id && f.id.startsWith('riro_'))
        .forEach(f => (f.pigeons || []).forEach(p => {
            const prize = (Number(p.asPoints) > 0) || (Number(p.prizesRV) > 0);
            registerRing(p.ringNumber, true, prize);
        }));

    // Historische Flüge – hist_-Flüge (nicht aktuelle Saison, kein Preis hier)
    appData.flights
        .filter(f => f.id && f.id.startsWith('hist_'))
        .forEach(f => (f.pigeons || []).forEach(p => registerRing(p.ringNumber, false, false)));

    // myPigeons (manuell) → aktive Gruppe, Preis unbekannt
    (appData.myPigeons || []).forEach(r => registerRing(r, true, false));

    // ── Drei Eimer: 1. Preisträger, 2. Aktiv ohne Preis, 3. Archiv ──────────
    // Sektion 1 (gold) = hasPrize
    // Sektion 2 (normal) = inCurrent && !hasPrize  +  alle hist_-only
    const prizedEntries  = [...ringMap.values()].filter(e =>  e.hasPrize).sort(sortByEndNum);
    const restEntries    = [...ringMap.values()].filter(e => !e.hasPrize).sort(sortByEndNum);

    // ── SEKTION 1: Preisträger dieser Saison – gold markiert ────────────────
    if (prizedEntries.length) {
        const grp1 = document.createElement('optgroup');
        grp1.label = `🏆 Saison ${new Date().getFullYear()} – mit Preis`;
        prizedEntries.forEach(e => {
            const o = document.createElement('option');
            o.value = e.display;
            o.textContent = endNum(e.display) + ' (' + e.display + ')';
            o.style.color = '#FFD700';        // Gold
            o.style.fontWeight = '700';
            grp1.appendChild(o);
        });
        pigeonHistorySelector.appendChild(grp1);
    }

    // ── SEKTION 2: Restliche Tauben (aktiv ohne Preis + Archiv) ─────────────
    if (restEntries.length) {
        const grp2 = document.createElement('optgroup');
        grp2.label = '📋 Alle weiteren Tauben';
        restEntries.forEach(e => {
            const o = document.createElement('option');
            o.value = e.display;
            o.textContent = endNum(e.display) + ' (' + e.display + ')';
            grp2.appendChild(o);
        });
        pigeonHistorySelector.appendChild(grp2);
    }

    // Fallback
    if (!prizedEntries.length && !restEntries.length) {
        const o = document.createElement('option');
        o.disabled = true;
        o.textContent = 'Noch keine Tauben importiert';
        pigeonHistorySelector.appendChild(o);
    }
}

if (pigeonHistorySelector) {

    // ── Farb-Palette pro Saison (dynamisch, zukunftssicher) ─────────────────
    // Index 0 = ältestes Jahr in der DB, wächst automatisch mit.
    const SEASON_PALETTE = [
        '#fbbf24', // 2025 – Gold
        '#00d4ff', // 2026 – Cyan
        '#34d399', // 2027 – Grün
        '#f87171', // 2028 – Rot
        '#a78bfa', // 2029 – Lila
        '#fb923c', // 2030 – Orange
        '#38bdf8', // 2031 – Hellblau
        '#4ade80', // 2032 – Hellgrün
    ];

    function getSeasonColor(year, sortedYears) {
        const idx = sortedYears.indexOf(year);
        return SEASON_PALETTE[idx % SEASON_PALETTE.length] || '#ffffff';
    }

    // ── Hilfsfunktion: Datum aus Flug-ID / releaseTime extrahieren ───────────
    function flightSortDate(f) {
        // Aus releaseTime ISO-String (z.B. "2025-06-14T09:20")
        if (f.releaseTime) {
            const d = new Date(f.releaseTime);
            if (!isNaN(d)) return d;
        }
        // Fallback: aus Flight-Name "DD.MM.YYYY ..." parsen
        const m = (f.name || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        return new Date(0);
    }

    // ── Saison-Jahr aus Flug ermitteln ───────────────────────────────────────
    function flightYear(f) {
        if (f.season) return Number(f.season);
        const d = flightSortDate(f);
        return d.getFullYear();
    }

    pigeonHistorySelector.addEventListener('change', e => {
        const ring = e.target.value;
        if (!ring) { pigeonHistoryContainer.style.display = 'none'; renderFormRadar(null); return; }
        pigeonHistoryContainer.style.display = 'block';
        renderFormRadar(ring);
        pigeonHistoryBody.innerHTML = '';

        const normRing = normalizeRing(ring);

        // ── ALLE Flüge aller Saisons sammeln (riro_ + hist_) ────────────────
        // Nur echte Preislisten-Flüge (kein manueller flight_ ohne ID-Prefix)
        const allFlights = appData.flights
            .filter(f => f.id && (f.id.startsWith('riro_') || f.id.startsWith('hist_')))
            .sort((a, b) => flightSortDate(a) - flightSortDate(b)); // chronologisch

        // Alle vorhandenen Saisons (sortiert aufsteigend) für Farb-Index
        const allYears = [...new Set(allFlights.map(flightYear))].sort((a, b) => a - b);

        let totalPrizes = 0, totalAS = 0;
        // Chart-Datenpunkte: label, pts, Farbe des Jahres
        // chartTooltips = voller Flugname für den Tooltip (auch auf Mobile)
        const chartLabels = [], chartTooltips = [], chartPts = [], chartColors = [];

        allFlights.forEach(f => {
            const p = (f.pigeons || []).find(x => normalizeRing(x.ringNumber) === normRing);
            const speed = p ? calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime) : 0;
            const prs   = p ? (Number(p.prizesRV) || 0) : 0;
            const pts   = p ? (Number(p.asPoints)  || 0) : 0;
            totalPrizes += prs;
            totalAS     += pts;

            const yr = flightYear(f);
            const seasonColor = getSeasonColor(yr, allYears);

            const wStr = f.weather && (f.weather.release || f.weather.home)
                ? ((f.weather.release || '') + ' / ' + (f.weather.home || '')) : '--';

            // WBI
            let wbiStr = '-';
            if (speed > 0 && f.releaseLat && f.releaseLon && f.weather) {
                const wSpeed = f.weather.windSpeed || 0;
                const wDir   = f.weather.windDir   || 0;
                if (wSpeed > 0) {
                    const aero = calcWindEffect(f.releaseLat, f.releaseLon, HOME_LAT, HOME_LON, wSpeed, wDir);
                    const windBoost = aero.wEff - (aero.wSide * 0.1);
                    const wbiValue  = speed - windBoost;
                    const diff  = windBoost >= 0 ? `+${windBoost.toFixed(0)}` : `${windBoost.toFixed(0)}`;
                    const wCol  = windBoost > 20 ? '#39ff14' : windBoost < -20 ? '#ff4444' : 'var(--gold)';
                    wbiStr = `<span style="color:var(--gold);font-weight:700;">${wbiValue.toFixed(0)}</span> <span style="font-size:0.65rem;color:${wCol};">(${diff})</span>`;
                } else {
                    wbiStr = `<span style="color:var(--gold);">${speed.toFixed(0)}</span> <span style="font-size:0.65rem;color:rgba(255,255,255,0.3);">(±0)</span>`;
                }
            }

            const rvPlatz   = p ? (p.rvPlatz || 0) : 0;
            const rvDisplay = rvPlatz === 'EF'
                ? '<span style="color:rgba(255,255,255,0.3);font-size:0.7rem;">EF</span>'
                : (rvPlatz > 0 ? rvPlatz : '—');

            // Saison-Farbpunkt in der Spalte "Datum/Flug"
            const dot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${seasonColor};margin-right:5px;vertical-align:middle;"></span>`;

            const tr = document.createElement('tr');
            if (!p) tr.style.opacity = '0.4'; // nicht teilgenommen
            tr.innerHTML = `<td>${dot}${f.name}</td><td>${f.distanceMeters ? (f.distanceMeters/1000).toFixed(1)+' km' : '-'}</td><td style="font-size:0.8rem;color:#aaa">${wStr}</td><td style="text-align:center;color:var(--gold);font-weight:700;">${rvDisplay}</td><td class="highlight">${speed > 0 ? speed.toFixed(1) : '-'}</td><td>${wbiStr}</td><td>${pts.toFixed(2)}</td>`;
            pigeonHistoryBody.appendChild(tr);

            // Chart-Punkt: IMMER für jeden gespeicherten Wettflug (= echte RV-Preisliste).
            // p === null  → Taube nicht platziert → 0 AS-Punkte (Flug bleibt sichtbar!).
            // Desktop: kurzes Label "26 Aschaffenburg"; Mobile: Labels werden per Chart-Config
            // komplett ausgeblendet – chartTooltips behält immer den vollen Namen für den Tooltip.
            const rawOrt = (f.name || '').split('(')[0].trim().split(' ').slice(1).join(' ').trim();
            const shortLabel = `${yr.toString().slice(2)} ${rawOrt}`;
            const isMobileChart = window.innerWidth <= 768;
            // Radikaler Fix: Auf Mobile komplett leere Labels in die Achse, damit Chart.js GAR NICHTS rendert.
            chartLabels.push(isMobileChart ? '' : shortLabel);
            chartTooltips.push(f.name || shortLabel);  // voller Name für Tooltip bleibt!
            chartPts.push(pts);
            chartColors.push(seasonColor);


        });

        pigeonHistorySummary.textContent = `Gesamt Allzeit: ${totalAS.toFixed(2)} AS-Punkte | ${allYears.join(', ')}`;

        // ── Chart aufbauen ───────────────────────────────────────────────────
        const ctx = document.getElementById('asPointsChart').getContext('2d');
        if (asPointsChartInstance) asPointsChartInstance.destroy();

        const yMax = chartPts.length > 0 ? Math.max(100, Math.ceil(Math.max(...chartPts) / 10) * 10 + 10) : 100;
        const isMobileChart = window.innerWidth <= 768;

        asPointsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: ring,
                    data: chartPts,
                    borderColor: ctx => chartColors[ctx.dataIndex] || '#00d4ff',
                    segment: {
                        borderColor: ctx => chartColors[ctx.p1DataIndex] || '#00d4ff',
                    },
                    backgroundColor: 'rgba(0,212,255,0.06)',
                    borderWidth: 2.5,
                    pointRadius: isMobileChart ? 8 : 7,   // etwas größer auf Mobile → leichter antippbar
                    pointBackgroundColor: chartColors,
                    pointBorderColor: 'rgba(0,0,0,0.3)',
                    pointBorderWidth: 1,
                    tension: 0.35,
                    fill: true,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: {
                    // Auf Mobile: kein Padding links/rechts → Kurve nutzt volle Breite
                    padding: isMobileChart ? { left: 0, right: 4, top: 4, bottom: 0 } : {}
                },
                scales: {
                    y: {
                        beginAtZero: true, max: yMax,
                        title: { display: !isMobileChart, text: 'AS-Punkte (alle Saisons)', color: 'rgba(255,255,255,0.55)', font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        ticks: { color: 'rgba(255,255,255,0.7)', stepSize: 10, font: { size: isMobileChart ? 9 : 10 } }
                    },
                    x: {
                        display: false
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            // Tooltip-Titel: voller Flugname aus chartTooltips (Datum + Ort)
                            title: ctxArr => chartTooltips[ctxArr[0].dataIndex] || chartLabels[ctxArr[0].dataIndex] || '',
                            label: ctx => ` ${ctx.parsed.y.toFixed(2)} AS-Pkt`
                        }
                    }
                }
            }
        });

    });
}

// Wetterkarte Zustand

let routeMap = null;
let radarLayer = null;

// ============================================================
const routeWeatherBtn = document.getElementById('route-weather-btn');
const routeWeatherView = document.getElementById('weather-inline-section');
const backToMainBtn = document.getElementById('weather-close-btn');
const routeWeatherLoading = document.getElementById('route-weather-loading');
const routeWeatherTimeline = document.getElementById('route-weather-timeline');
const reiseplanSelect = document.getElementById('reiseplan-select');
const appContainer = document.querySelector('.app-container');

// Populate Reiseplan dropdown
if (reiseplanSelect) {
    const seenOrts = new Set();
    REISEPLAN_2026.forEach((entry, i) => {
        if (!seenOrts.has(entry.ort)) {
            seenOrts.add(entry.ort);
            const o = document.createElement('option');
            o.value = i;
            o.textContent = entry.ort + ' (' + entry.km + ' km)';
            reiseplanSelect.appendChild(o);
        }
    });
    reiseplanSelect.addEventListener('change', () => {
        if (reiseplanSelect.value !== '') {
            routeWeatherTimeline.innerHTML = '';
            routeWeatherTimeline.style.display = 'none';
            routeWeatherLoading.style.display = 'block';
            routeWeatherLoading.textContent = 'Wetterdaten werden abgerufen...';
            const originalEntry = REISEPLAN_2026[parseInt(reiseplanSelect.value)];
            const entryForWeather = { ...originalEntry };
            delete entryForWeather.datum; // Zwingt die App, immer aktuelles Wetter (Forecast) abzurufen
            loadRouteWeather(entryForWeather);
        }
    });
}

if (routeWeatherBtn && routeWeatherView) {
    routeWeatherBtn.addEventListener('click', () => {
        // Inline-Section einblenden
        routeWeatherView.style.display = 'block';
        routeWeatherView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        routeWeatherTimeline.style.display = 'none';
        routeWeatherLoading.textContent = 'Bitte einen Auflaßort aus der Liste auswählen...';
        routeWeatherLoading.style.display = 'block';
        routeWeatherTimeline.innerHTML = '';
        // Reiseplan-Dropdown mit aktuellem Flug vorbelegen
        const cf = getCurrentFlight();
        if (cf && reiseplanSelect) {
            const idx = REISEPLAN_2026.findIndex(e => Math.abs(e.lat - cf.releaseLat) < 0.01 && Math.abs(e.lon - cf.releaseLon) < 0.01);
            if (idx >= 0) {
                reiseplanSelect.value = idx;
                routeWeatherLoading.textContent = 'Wetterdaten werden abgerufen...';
                const originalEntry = REISEPLAN_2026[idx];
                const entryForWeather = { ...originalEntry };
                delete entryForWeather.datum; // Zwingt die App, immer aktuelles Wetter abzurufen
                loadRouteWeather(entryForWeather);
            } else { reiseplanSelect.value = ''; }
        }
    });
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            routeWeatherView.style.display = 'none';
        });
    }
}

function getWeatherEmoji(code) {
    if (code == null) return '?';
    if (code === 0) return 'Sonnig';
    if (code <= 2) return 'Heiter';
    if (code === 3) return 'Bewoelkt';
    if (code <= 48) return 'Nebel';
    if (code <= 67) return 'Regen';
    if (code <= 77) return 'Schnee';
    if (code <= 82) return 'Schauer';
    return 'Gewitter';
}

function getWindArrow(deg) {
    if (deg == null) return '';
    // Arrow points in direction wind comes FROM (meteorological convention: deg = origin)
    const rotation = deg;
    return `<svg width="22" height="22" viewBox="0 0 24 24" style="transform:rotate(${rotation}deg);display:inline-block;vertical-align:middle;filter:drop-shadow(0 0 4px #39ff14);" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 16,18 12,14 8,18" fill="#39ff14"/></svg>`;
}

async function loadRouteWeather(entry) {
    try {
        const startLat = entry.lat, startLon = entry.lon;
        const endLat = HOME_LAT, endLon = HOME_LON;
        const totalDist = calculateDistance(startLat, startLon, endLat, endLon);
        const seg = 50000;
        const numSeg = Math.floor(totalDist / seg);

        const waypoints = [{ lat: startLat, lon: startLon, name: entry.ort + ' (Auflassort)', dist: 0, windDir: null, windDeg: null }];
        for (let i = 1; i <= numSeg; i++) {
            const f = (i * seg) / totalDist;
            waypoints.push({ lat: startLat + f * (endLat - startLat), lon: startLon + f * (endLon - startLon), name: (i * 50) + ' km', dist: i * 50, windDir: null, windDeg: null });
        }
        const lastWP = waypoints[waypoints.length - 1];
        if ((totalDist - lastWP.dist * 1000) > 10000) {
            waypoints.push({ lat: endLat, lon: endLon, name: ACTIVE_BREEDER.name + ' (Heim)', dist: Math.round(totalDist / 1000), windDir: null, windDeg: null });
        } else {
            lastWP.name = ACTIVE_BREEDER.name + ' (Heim)';
            lastWP.dist = Math.round(totalDist / 1000);
        }

        // Reverse-Geocoding für Zwischenstationen (Stadtnamen)
        const geoPromises = waypoints.slice(1, -1).map(async (wp, i) => {
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${wp.lat}&lon=${wp.lon}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'de' } });
                const d = await r.json();
                const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
                if (city) wp.name = city + ' (' + wp.dist + ' km)';
            } catch (e) { /* keep distance name as fallback */ }
        });
        await Promise.allSettled(geoPromises);

        // ── Historisch vs. Forecast: Vergangenheits-Flüge → Archive-API ──
        let isPast = false;
        let isoDate = '';
        let releaseHour = 10; // Default: 10:00 Uhr
        if (entry.datum) {
            const [dd, mm, yyyy] = entry.datum.split('.').map(Number);
            const flugDate = new Date(yyyy, mm - 1, dd);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            isPast = flugDate < today;
            isoDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
        // Auflasszeit aus aktuellem Flug ermitteln
        const cf = getCurrentFlight();
        if (cf && cf.releaseTime) {
            const rt = new Date(cf.releaseTime);
            if (!isNaN(rt)) releaseHour = rt.getHours();
        }
        // ETA-basierte Stunde pro Wegpunkt berechnen
        // Geschätzte Flugzeit = Distanz / ~70 km/h durchschnittliche Taubengeschwindigkeit
        const estFlightHours = totalDist / 70000; // totalDist in Metern
        function getWaypointHour(wpIndex, wpCount) {
            const fraction = wpIndex / Math.max(1, wpCount - 1);
            return Math.min(23, Math.round(releaseHour + fraction * estFlightHours));
        }

        let results;
        let weatherSource = 'forecast';
        if (isPast && isoDate) {
            // HISTORISCH: Open-Meteo Archive API mit stündlichen Daten
            weatherSource = 'archive';
            console.log(`[Wetter] Historische Daten für ${isoDate}, Auflasszeit: ${releaseHour}:00, ETA-Dauer: ~${estFlightHours.toFixed(1)}h`);
            results = await Promise.all(waypoints.map(async (wp, wpIdx) => {
                const wpHour = getWaypointHour(wpIdx, waypoints.length);
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${wp.lat}&longitude=${wp.lon}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode`;
                const r = await fetch(url);
                const d = await r.json();
                let w = null;
                if (d.hourly && d.hourly.time) {
                    // Dynamische Stunde pro Wegpunkt (interpoliert zwischen Auflass und ETA)
                    const targetStr = `${isoDate}T${String(wpHour).padStart(2, '0')}:00`;
                    let idx = d.hourly.time.indexOf(targetStr);
                    if (idx < 0) idx = d.hourly.time.findIndex(t => t.includes(`T${String(wpHour).padStart(2, '0')}`));
                    if (idx < 0) idx = Math.min(wpHour, d.hourly.time.length - 1);
                    w = {
                        temperature_2m: d.hourly.temperature_2m[idx],
                        windspeed_10m: d.hourly.windspeed_10m[idx],
                        winddirection_10m: d.hourly.winddirection_10m[idx],
                        precipitation: d.hourly.precipitation ? d.hourly.precipitation[idx] : 0,
                        weathercode: d.hourly.weathercode ? d.hourly.weathercode[idx] : null
                    };
                }
                if (w) { wp.windDeg = w.winddirection_10m; wp.windDir = getWindDirection(w.winddirection_10m); }
                return { wp, weather: w };
            }));
        } else {
            // LIVE: Forecast API (aktuelles Wetter)
            results = await Promise.all(waypoints.map(async wp => {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lon}&current=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode`;
                const r = await fetch(url);
                const d = await r.json();
                if (d.current) { wp.windDeg = d.current.winddirection_10m; wp.windDir = getWindDirection(d.current.winddirection_10m); }
                return { wp, weather: d.current };
            }));
        }

        routeWeatherTimeline.innerHTML = '';
        const timeLabel = isPast ? `${entry.datum} ${String(targetHour).padStart(2, '0')}:00` : 'Jetzt';
        results.forEach(({ wp, weather: w }) => {
            const card = document.createElement('div');
            card.className = 'weather-card';
            const windDir = w ? getWindDirection(w.winddirection_10m) : '-';
            const temp = w ? (w.temperature_2m != null ? w.temperature_2m + '°C' : '-') : '-';
            const wind = w ? Math.round(w.windspeed_10m) + ' km/h ' + windDir : '-';
            const icon = w ? getWeatherEmoji(w.weathercode) : '?';
            const label = wp.name.length > 18 ? wp.name.substring(0, 17) + '…' : wp.name;
            card.innerHTML = `
                <div class="wc-time">${wp.dist} km</div>
                <div class="wc-icon">${icon}</div>
                <div class="wc-temp">${temp}</div>
                <div class="wc-wind">${wind} ${w && w.winddirection_10m != null ? '<span style="display:inline-block;color:#39ff14;font-size:1.1rem;transform:rotate(' + w.winddirection_10m + 'deg);filter:drop-shadow(0 0 3px #39ff14);">↓</span>' : ''}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px; font-weight:600;">${label}</div>
                <div style="font-size:0.62rem; color:rgba(255,255,255,0.2); margin-top:1px;">${isPast ? '📜 Historisch' : '🔴 Live'}</div>`;
            routeWeatherTimeline.appendChild(card);
        });

        // Wetter-Daten in Flight-Objekt speichern (für ETA/Prognose)
        if (cf && results.length > 0) {
            const validWeather = results.filter(r => r.weather).map(r => r.weather);
            if (validWeather.length > 0) {
                const avgSpeed = validWeather.reduce((s, w) => s + w.windspeed_10m, 0) / validWeather.length;
                const sinSum = validWeather.reduce((s, w) => s + Math.sin(w.winddirection_10m * Math.PI / 180), 0);
                const cosSum = validWeather.reduce((s, w) => s + Math.cos(w.winddirection_10m * Math.PI / 180), 0);
                const avgDir = Math.round(((Math.atan2(sinSum / validWeather.length, cosSum / validWeather.length) * 180 / Math.PI) + 360) % 360);
                const avgTemp = validWeather.reduce((s, w) => s + (w.temperature_2m || 0), 0) / validWeather.length;
                const avgPrecip = validWeather.reduce((s, w) => s + (w.precipitation || 0), 0) / validWeather.length;
                // Echte Wetterdaten in Flight-Weather schreiben
                if (!cf.weather) cf.weather = {};
                cf.weather.release = getWindDirection(avgDir) + ' ' + Math.round(avgTemp) + '°C ' + Math.round(avgSpeed) + 'km/h';
                cf.weather.windSpeed = Math.round(avgSpeed);
                cf.weather.windDir = avgDir;
                cf.weather.precipitation = Math.round(avgPrecip * 10) / 10;
                cf.weather.source = weatherSource;
                saveData();
                console.log(`[Wetter] ${weatherSource}: ∅ ${Math.round(avgSpeed)} km/h aus ${getWindDirection(avgDir)} (${avgDir}°), ${Math.round(avgTemp)}°C, Niederschlag: ${avgPrecip.toFixed(1)}mm`);
            }
        }

        routeWeatherLoading.style.display = 'none';
        routeWeatherTimeline.style.display = 'flex';

        // 3-Zonen-Flugkorridor-Radar rendern
        const releaseH = cf && cf.releaseTime ? new Date(cf.releaseTime).getHours() : 9;
        render3ZoneWeather(entry, releaseH).catch(e => console.warn('[3-Zonen] Fehler:', e));

        // --- Draw Map with Rain Radar ---
        const mapDiv = document.getElementById('route-map');
        mapDiv.style.display = 'block';

        // Destroy previous map instance if exists
        if (routeMap) { routeMap.remove(); routeMap = null; }

        // Center map between start and home
        const centerLat = (entry.lat + HOME_LAT) / 2;
        const centerLon = (entry.lon + HOME_LON) / 2;
        routeMap = L.map('route-map').setView([centerLat, centerLon], 7);

        // Base map layers (umschaltbar: Karte / Satellit)
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        });
        const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery',
            maxZoom: 19
        });
        // Standard: Kartenansicht
        osmLayer.addTo(routeMap);
        // Layer-Control oben rechts
        L.control.layers({ '🗺️ Karte': osmLayer, '🛰️ Satellit': satLayer }, {}, { position: 'topright', collapsed: false }).addTo(routeMap);

        // Beim Layer-Wechsel: Label-Farben anpassen (schwarz auf Karte, weiß auf Satellit)
        let currentIsSatellite = false;
        const labelMarkers = [];
        routeMap.on('baselayerchange', (e) => {
            currentIsSatellite = e.name.includes('Satellit');
            labelMarkers.forEach(m => {
                const el = m.getElement();
                if (el) {
                    const div = el.querySelector('div');
                    if (div) {
                        div.style.color = currentIsSatellite ? '#fff' : '#000';
                        div.style.textShadow = currentIsSatellite
                            ? '0 0 4px #000, 0 0 8px #000, 0 1px 2px #000'
                            : '0 0 3px #fff, 0 0 6px #fff';
                    }
                }
            });
            // Radar-Layer nach Layer-Wechsel immer nach vorne bringen
            if (radarLayer) radarLayer.bringToFront();
        });

        // Draw flight route as green polyline
        const routeCoords = waypoints.map(wp => [wp.lat, wp.lon]);
        L.polyline(routeCoords, { color: '#39ff14', weight: 3, opacity: 0.9, dashArray: '6,4' }).addTo(routeMap);

        // Start marker (release point)
        L.circleMarker([entry.lat, entry.lon], { radius: 9, color: '#39ff14', fillColor: '#39ff14', fillOpacity: 0.9 })
            .addTo(routeMap).bindPopup('<b>' + entry.ort + '</b><br>Auflassort').openPopup();

        // Home marker
        L.circleMarker([HOME_LAT, HOME_LON], { radius: 9, color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.9 })
            .addTo(routeMap).bindPopup(`<b>Heimatschlag</b><br>${ACTIVE_BREEDER.name} (${HOME_LAT.toFixed(4)}, ${HOME_LON.toFixed(4)})`);

        // Wetterstationen als rote Punkte + Ortskürzel
        waypoints.slice(1, -1).forEach(wp => {
            // Roter Stations-Punkt
            L.circleMarker([wp.lat, wp.lon], { radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.85, weight: 2 })
                .addTo(routeMap)
                .bindPopup(`<b>📡 ${wp.name}</b><br>${wp.dist} km vom Start<br>Wind: ${wp.windDir || '-'} ${wp.windDeg != null ? wp.windDeg + '°' : ''}`);

            // Ortskürzel-Label (3 Buchstaben) – Farbe passt sich automatisch an
            const cityOnly = wp.name.replace(/\s*\(.*\)/, '').trim();
            const abbr = cityOnly.length > 5 ? cityOnly.substring(0, 3).toUpperCase() : cityOnly.toUpperCase();
            const labelIcon = L.divIcon({
                className: '',
                html: `<div style="color:#000;font-size:10px;font-weight:800;text-shadow:0 0 3px #fff,0 0 6px #fff;white-space:nowrap;transform:translate(-50%,-100%);">${abbr}</div>`,
                iconSize: [0, 0], iconAnchor: [0, -8]
            });
            const lm = L.marker([wp.lat, wp.lon], { icon: labelIcon, interactive: false }).addTo(routeMap);
            labelMarkers.push(lm);
        });

        // Rain Radar via RainViewer (free API)
        try {
            const rvResp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const rvData = await rvResp.json();
            const lastRadar = rvData.radar.past[rvData.radar.past.length - 1];
            if (lastRadar) {
                radarLayer = L.tileLayer(
                    'https://tilecache.rainviewer.com' + lastRadar.path + '/256/{z}/{x}/{y}/2/1_1.png',
                    { opacity: 0.55, attribution: 'RainViewer', zIndex: 400 }
                ).addTo(routeMap);
                radarLayer.bringToFront();
            }
        } catch (re) { console.warn('Radar nicht verfuegbar', re); }
    } catch (err) {
        console.error(err);
        routeWeatherLoading.textContent = 'Fehler beim Abrufen der Wetterdaten. Bitte nochmal versuchen.';
    }
}

// ============================================================
// --- Gesamt-Leistungstabelle Modal ---
// ============================================================
(function initGesamtModal() {
    const btn = document.getElementById('gesamt-tabelle-btn');
    const overlay = document.getElementById('gesamt-modal-overlay');
    const closeBtn = document.getElementById('gesamt-modal-close');
    const tbody = document.getElementById('gesamt-table-body');
    const summary = document.getElementById('gesamt-summary');
    const sortSel = document.getElementById('gesamt-sort-select');
    if (!btn || !overlay) return;

    // ── Saison-Jahr dynamisch setzen ──────────────────────────────────────────
    const SEASON_YEAR = new Date().getFullYear();
    btn.textContent = `🏆 Leistung (Saison ${SEASON_YEAR})`;
    const modalTitle    = document.getElementById('gesamt-modal-title');
    const modalSubtitle = document.getElementById('gesamt-modal-subtitle');
    if (modalTitle)    modalTitle.textContent    = `🏆 Leistung – Saison ${SEASON_YEAR}`;
    if (modalSubtitle) modalSubtitle.textContent = `Alle Alttauben – RV 403/06 · Saison ${SEASON_YEAR}`;
    // ─────────────────────────────────────────────────────────────────────────


    function renderGesamtTable() {
        if (!tbody) return;
        tbody.innerHTML = '';

        // Alle Tauben aus allen Flügen aggregieren
        // Ring als Schlüssel, korrekte Summenbildung mit Typ-Sicherheit
        // --- ZENTRALE AGGREGATION: Immer von Rohdaten ausgehen ---
        // pigeonMap wird bei jedem Aufruf NEU aufgebaut aus allen Flügen.
        // So verhindern wir, dass sich veraltete Werte ansammeln.
        const pigeonMap = {}; // key: normalizedRing → { displayRing, flights, prizes, asPoints }
        console.log('[Gesamt-Tabelle] Starte Aggregation über', appData.flights.length, 'Flüge');
        appData.flights.forEach(flight => {
            // Nur Alttauben-Flüge (id beginnt mit 'riro_')
            if (!flight.id || !flight.id.startsWith('riro_')) return;
            (flight.pigeons || []).forEach(p => {
                if (!p.ringNumber) return;
                const normKey = normalizeRing(p.ringNumber);
                if (!pigeonMap[normKey]) {
                    pigeonMap[normKey] = {
                        displayRing: p.ringNumber, // Anzeige-Format (mit Bindestrichen)
                        flights: 0, prizes: 0, asPoints: 0
                    };
                }
                // Flüge zählen (jede Teilnahme = 1 Flug)
                pigeonMap[normKey].flights++;
                // Preise: strikt als Number, erhöhe um Wert wenn > 0
                const preis = Number(p.prizesRV) || 0;
                if (preis > 0) pigeonMap[normKey].prizes += preis;
                // AS-Punkte: strikt als Number, Wert direkt addieren (0–100)
                const pts = Number(p.asPoints) || 0;
                if (pts > 0 && pts <= 100) pigeonMap[normKey].asPoints += pts;
                console.log('  [Gesamt]', p.ringNumber, '| Flug:', flight.name, '| Preis:', preis, '| AS:', pts);
            });
        });
        console.log('[Gesamt-Tabelle] Aggregation fertig:', Object.keys(pigeonMap).length, 'Tauben');

        // Anzeige-Ring aus pigeonMap verwenden (nicht den normalisierten Schlüssel)
        let rows = Object.entries(pigeonMap).map(([, d]) => ({ ring: d.displayRing, flights: d.flights, prizes: d.prizes, asPoints: d.asPoints }));

        // Sortierung
        const sortBy = sortSel ? sortSel.value : 'prizes';
        rows.sort((a, b) => sortBy === 'aspoints' ? b.asPoints - a.asPoints : b.prizes - a.prizes);

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b;">Noch keine Tauben importiert.</td></tr>';
            return;
        }

        rows.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 0 ? 'background:rgba(168,85,247,0.05)' : '';
            tr.innerHTML = `
                <td style="padding:9px 8px;color:#94a3b8;">${i + 1}</td>
                <td style="padding:9px 8px;font-weight:600;">
                    <span class="ring-link" data-ring="${row.ring}"
                        style="color:var(--cyan);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;transition:opacity 0.15s;"
                        onmouseover="this.style.opacity='0.7'"
                        onmouseout="this.style.opacity='1'">
                        ${row.ring}
                    </span>
                </td>
                <td style="padding:9px 8px;text-align:center;">${row.flights}</td>
                <td style="padding:9px 8px;text-align:center;color:#34d399;font-weight:700;">${row.asPoints.toFixed(2)}</td>`;
            tbody.appendChild(tr);
        });

        if (summary) {
            const totalAS = rows.reduce((a, r) => a + r.asPoints, 0);
            summary.textContent = `${rows.length} Tauben | ${totalAS.toFixed(2)} AS-Punkte gesamt`;
        }
    }

    // ── Event-Delegation: Klick auf Ringnummer öffnet Archiv-Modal ──────────
    tbody.addEventListener('click', e => {
        const span = e.target.closest('.ring-link');
        if (span) window.openArchivPigeonModal(span.dataset.ring);
    });
    // ────────────────────────────────────────────────────────────────────────

    btn.addEventListener('click', () => {
        renderGesamtTable();
        overlay.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => overlay.style.display = 'none');
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
    if (sortSel) sortSel.addEventListener('change', renderGesamtTable);
})();

// ============================================================
// --- Archiv: Gesamtleistung Einzeltaube Modal ---
// ============================================================
(function initArchivPigeonModal() {
    const overlay   = document.getElementById('archiv-pigeon-overlay');
    const closeBtn  = document.getElementById('archiv-pigeon-close');
    const titleEl   = document.getElementById('archiv-pigeon-title');
    const subtitleEl= document.getElementById('archiv-pigeon-subtitle');
    const statFlights  = document.getElementById('archiv-stat-flights');
    const statPrizes   = document.getElementById('archiv-stat-prizes');
    const statAspoints = document.getElementById('archiv-stat-aspoints');
    const tbody     = document.getElementById('archiv-pigeon-tbody');
    if (!overlay || !tbody) return;

    let archivChartInstance = null; // eigene Instanz, kein Konflikt mit asPointsChartInstance

    // Schließen
    closeBtn.addEventListener('click', () => overlay.style.display = 'none');
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

    // ── Globale Öffnungs-Funktion ─────────────────────────────────────────────
    window.openArchivPigeonModal = function(ring) {
        if (!ring) return;
        const normRing = normalizeRing(ring);
        const yr = new Date().getFullYear();

        // Titel setzen
        titleEl.textContent    = `🐦 ${ring}`;
        subtitleEl.textContent = `Gesamtleistung · RV 403/06 · Saison ${yr}`;

        // ── Alle riro_-Flüge als Basis (gleiche Logik wie Saisonleistung) ──
        const riroFlights = appData.flights.filter(f => f.id && f.id.startsWith('riro_'));

        let totalFlights = 0, totalPrizes = 0, totalAS = 0;
        const labels = [], chartData = [];
        tbody.innerHTML = '';

        riroFlights.forEach(flight => {
            const p = (flight.pigeons || []).find(x => normalizeRing(x.ringNumber) === normRing);
            const participated = !!p;

            // Statistiken akkumulieren
            const preis = participated ? (Number(p.prizesRV) || 0) : 0;
            const pts   = participated ? (Number(p.asPoints)  || 0) : 0;
            const speed = participated ? calculateSpeed(flight.distanceMeters, flight.releaseTime, p.arrivalTime) : 0;

            // Der Counter für "FLÜGE" muss stumpf ALLE Flüge zählen (= Anzahl der Zeilen in der Tabelle)
            totalFlights++;

            if (participated) {
                totalPrizes += preis;
                totalAS     += pts;
            }

            // RV-Platz formatieren
            let rvDisplay = '—';
            if (participated) {
                const rvPlatz = p.rvPlatz || 0;
                rvDisplay = rvPlatz === 'EF'
                    ? '<span style="color:rgba(255,255,255,0.35);font-size:0.75rem;">EF</span>'
                    : (rvPlatz > 0 ? `<span style="color:var(--gold);font-weight:700;">${rvPlatz}</span>` : '—');
            }

            // Flugname: Datum aus name extrahieren (Format "Ort (TT.MM.JJJJ)")
            const nameShort = flight.name || '—';
            const kmStr     = flight.distanceMeters ? (flight.distanceMeters / 1000).toFixed(0) : '—';
            const speedStr  = (participated && speed > 0) ? speed.toFixed(1) : '—';
            const ptsStr    = participated ? `<span style="color:#34d399;font-weight:700;">${pts.toFixed(2)}</span>` : '<span style="color:rgba(255,255,255,0.25);">—</span>';

            // Tabellenzeile
            const tr = document.createElement('tr');
            if (!participated) tr.style.opacity = '0.45';
            tr.innerHTML = `
                <td style="padding:8px;">${nameShort}</td>
                <td style="padding:8px;text-align:right;color:rgba(255,255,255,0.6);">${kmStr}</td>
                <td style="padding:8px;text-align:center;">${rvDisplay}</td>
                <td style="padding:8px;text-align:right;color:var(--cyan);">${speedStr}</td>
                <td style="padding:8px;text-align:right;">${ptsStr}</td>`;
            tbody.appendChild(tr);

            // Chart-Datenpunkte (IMMER für jeden Flug: pts ist 0 wenn nicht platziert)
            labels.push(nameShort.split('(')[0].trim().split(' ').slice(0,2).join(' ') || nameShort);
            chartData.push(pts);
        });

        // Fallback wenn keine Flüge
        if (!riroFlights.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:rgba(255,255,255,0.35);">Noch keine Flugdaten importiert.</td></tr>';
        }

        // Stat-Kacheln befüllen
        if (statFlights)  statFlights.textContent  = totalFlights;
        if (statPrizes)   statPrizes.textContent    = totalPrizes || '—';
        if (statAspoints) statAspoints.textContent  = totalAS > 0 ? totalAS.toFixed(2) : '—';

        // ── Chart aufbauen ──────────────────────────────────────────────────
        const canvas = document.getElementById('archiv-pigeon-chart');
        if (canvas) {
            if (archivChartInstance) { archivChartInstance.destroy(); archivChartInstance = null; }
            if (chartData.length > 0) {
                const yMax = Math.max(100, Math.ceil(Math.max(...chartData) / 10) * 10 + 10);
                archivChartInstance = new Chart(canvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: ring,
                            data: chartData,
                            borderColor: '#00d4ff',
                            backgroundColor: 'rgba(0,212,255,0.10)',
                            borderWidth: 2.5,
                            pointRadius: 5,
                            pointBackgroundColor: chartData.map(v => v >= 80 ? '#fbbf24' : v >= 50 ? '#00d4ff' : '#ff4444'),
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true, max: yMax,
                                title: { display: true, text: 'AS-Punkte', color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
                                grid: { color: 'rgba(255,255,255,0.07)' },
                                ticks: { color: 'rgba(255,255,255,0.65)', stepSize: 20 }
                            },
                            x: { display: false }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        }

        // Modal öffnen
        overlay.style.display = 'block';
    };
})();

// ============================================================
// --- ETA Prognose Modal ---
// ============================================================
(function initEtaModal() {
    // HOME-Koordinaten dynamisch aus aktivem Züchter (wird bei jedem Calc frisch gelesen)

    const overlay = document.getElementById('eta-modal-overlay');
    const openBtn = document.getElementById('eta-prognose-btn');
    const closeBtn = document.getElementById('eta-modal-close');
    const ortSelect = document.getElementById('eta-ort-select');
    const ortInfo = document.getElementById('eta-ort-info');
    const calcBtn = document.getElementById('eta-calc-btn');
    const resultDiv = document.getElementById('eta-result');
    const windDirInput = document.getElementById('eta-wind-dir');
    const windLabel = document.getElementById('eta-wind-label');

    // Himmelsrichtungs-Label
    const DIRS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    function degToCompass(d) { return DIRS[Math.round(d / 22.5) % 16]; }

    // Dropdown aus REISEPLAN füllen (dedupliziert nach Ort+Datum)
    const seen = new Set();
    REISEPLAN_2026.forEach((e, i) => {
        const key = e.datum + '|' + e.ort;
        if (seen.has(key)) return;
        seen.add(key);
        const o = document.createElement('option');
        o.value = i;
        o.textContent = e.datum + ' – ' + e.ort + ' (' + e.km + ' km)';
        ortSelect.appendChild(o);
    });

    // Bearing zwischen zwei Punkten (Grad von N, im Uhrzeigersinn)
    function bearing(lat1, lon1, lat2, lon2) {
        const toRad = d => d * Math.PI / 180;
        const dLon = toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRad(lat2));
        const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
            - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    // Haversine Distanz in Metern
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Ort-Info aktualisieren + automatische Wetterdaten laden
    const windSpeedInput = document.getElementById('eta-wind-speed');
    const windHint = document.getElementById('eta-wind-hint');
    const windArrow = document.getElementById('eta-wind-arrow');

    // Pfeil rotieren: Pfeilspitze zeigt in Richtung, WOHIN der Wind weht (deg + 180)
    function updateWindArrow(deg) {
        if (windArrow) windArrow.style.transform = `rotate(${deg}deg)`;
    }

    // Ort-Info aktualisieren + automatische Wetterdaten laden
    ortSelect.addEventListener('change', async () => {
        const idx = parseInt(ortSelect.value);
        if (isNaN(idx)) { ortInfo.textContent = ''; return; }
        const e = REISEPLAN_2026[idx];
        const dist = haversine(e.lat, e.lon, HOME_LAT, HOME_LON);
        const br = bearing(e.lat, e.lon, HOME_LAT, HOME_LON);
        ortInfo.textContent = `Koordinaten: ${e.lat.toFixed(4)}, ${e.lon.toFixed(4)} | Distanz: ${(dist / 1000).toFixed(1)} km | Flugrichtung: ${br.toFixed(0)}° (${degToCompass(br)})`;
        resultDiv.style.display = 'none';

        // --- Automatische Routenwetter-Abfrage mit robustem Fallback ---
        // Zeige niemals "0" oder Fehlermeldung – immer Fallback-Werte

        // Vorausfüllen mit Schätzwerten (sofort sichtbar, kein Leerstand)
        const FALLBACK_WIND_SPEED = 15; // typischer Mittelwert
        const FALLBACK_WIND_DIR = br > 180 ? Math.round(br - 180) : Math.round(br + 180);
        windSpeedInput.value = FALLBACK_WIND_SPEED;
        windDirInput.value = FALLBACK_WIND_DIR;
        windLabel.textContent = degToCompass(FALLBACK_WIND_DIR) + 'wind (' + FALLBACK_WIND_DIR + '°)';
        updateWindArrow(FALLBACK_WIND_DIR);
        windHint.textContent = '⏳ Wetterdaten werden geladen...';
        windHint.style.color = 'rgba(255,200,0,0.7)';

        // Prüfe ob der aktuelle Flug bereits Wetterdaten hat → sofort verwenden
        const cf = getCurrentFlight();
        if (cf && cf.weather && cf.weather.windSpeed > 0) {
            windSpeedInput.value = cf.weather.windSpeed;
            windDirInput.value = cf.weather.windDir || FALLBACK_WIND_DIR;
            windLabel.textContent = degToCompass(cf.weather.windDir || FALLBACK_WIND_DIR)
                + 'wind (' + (cf.weather.windDir || FALLBACK_WIND_DIR) + '°)';
            updateWindArrow(cf.weather.windDir || FALLBACK_WIND_DIR);
            windHint.textContent = '⚡ Aus gespeichertem Flug-Wetter';
            windHint.style.color = 'rgba(0,212,255,0.55)';
            // Trotzdem frische Daten im Hintergrund nachladen (non-blocking)
        }

        // Historisch vs. Live bestimmen
        let etaIsPast = false, etaIsoDate = '';
        if (e.datum) {
            const [dd, mm, yyyy] = e.datum.split('.').map(Number);
            const flugDate = new Date(yyyy, mm - 1, dd);
            const today2 = new Date(); today2.setHours(0, 0, 0, 0);
            etaIsPast = flugDate < today2;
            etaIsoDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
        const etaTargetHour = parseInt(
            document.getElementById('eta-release-time')?.value?.split(':')[0] || '9'
        );

        // Waypoints entlang der Route (alle 50km)
        const seg = 50000;
        const numSeg = Math.floor(dist / seg);
        const waypoints = [{ lat: e.lat, lon: e.lon }];
        for (let i = 1; i <= numSeg; i++) {
            const f = (i * seg) / dist;
            waypoints.push({
                lat: e.lat + f * (HOME_LAT - e.lat),
                lon: e.lon + f * (HOME_LON - e.lon),
            });
        }
        waypoints.push({ lat: HOME_LAT, lon: HOME_LON });

        // Robuste Einzel-Abfrage pro Waypoint
        async function fetchWpWeatherEta(wp) {
            // Versuch 1: Historische Archive-API (vergangene Flüge)
            if (etaIsPast && etaIsoDate) {
                try {
                    const url = `https://archive-api.open-meteo.com/v1/archive` +
                        `?latitude=${wp.lat}&longitude=${wp.lon}` +
                        `&start_date=${etaIsoDate}&end_date=${etaIsoDate}` +
                        `&hourly=windspeed_10m,winddirection_10m`;
                    const r = await fetch(url);
                    if (r.ok) {
                        const d = await r.json();
                        if (d.hourly && d.hourly.time && d.hourly.time.length > 0) {
                            const tStr = `${etaIsoDate}T${String(etaTargetHour).padStart(2, '0')}:00`;
                            let idx = d.hourly.time.indexOf(tStr);
                            if (idx < 0) idx = Math.min(etaTargetHour, d.hourly.time.length - 1);
                            if (idx >= 0 &&
                                d.hourly.windspeed_10m[idx] != null &&
                                d.hourly.winddirection_10m[idx] != null) {
                                return {
                                    windspeed_10m: d.hourly.windspeed_10m[idx],
                                    winddirection_10m: d.hourly.winddirection_10m[idx],
                                };
                            }
                        }
                    }
                } catch (archiveErr) {
                    console.warn('[ETA-Wetter] Archive-API Fehler:', archiveErr.message);
                    // → Fallthrough zu Forecast-API
                }
            }

            // Versuch 2: Live-Forecast-API (zukünftige oder aktuelle Flüge)
            try {
                const liveUrl = `https://api.open-meteo.com/v1/forecast` +
                    `?latitude=${wp.lat}&longitude=${wp.lon}` +
                    `&current=windspeed_10m,winddirection_10m`;
                const lr = await fetch(liveUrl);
                if (lr.ok) {
                    const ld = await lr.json();
                    if (ld.current &&
                        ld.current.windspeed_10m != null &&
                        ld.current.winddirection_10m != null) {
                        return ld.current;
                    }
                }
            } catch (forecastErr) {
                console.warn('[ETA-Wetter] Forecast-API Fehler:', forecastErr.message);
            }

            // Versuch 3: Forecast stündlich (robustester Fallback)
            try {
                const hourUrl = `https://api.open-meteo.com/v1/forecast` +
                    `?latitude=${wp.lat}&longitude=${wp.lon}` +
                    `&hourly=windspeed_10m,winddirection_10m&forecast_days=1`;
                const hr = await fetch(hourUrl);
                if (hr.ok) {
                    const hd = await hr.json();
                    if (hd.hourly && hd.hourly.windspeed_10m) {
                        const idx = Math.min(etaTargetHour, hd.hourly.windspeed_10m.length - 1);
                        if (hd.hourly.windspeed_10m[idx] != null) {
                            return {
                                windspeed_10m: hd.hourly.windspeed_10m[idx],
                                winddirection_10m: hd.hourly.winddirection_10m[idx],
                            };
                        }
                    }
                }
            } catch (hourErr) {
                console.warn('[ETA-Wetter] Hourly-Fallback Fehler:', hourErr.message);
            }

            // Alle Versuche fehlgeschlagen → null (kein Crash)
            return null;
        }

        try {
            // Alle Waypoints parallel abfragen (mit Timeout-Guard 8s)
            const timeoutPromise = new Promise(resolve =>
                setTimeout(() => resolve(null), 8000)
            );
            const weatherResults = await Promise.race([
                Promise.all(waypoints.map(wp => fetchWpWeatherEta(wp))),
                timeoutPromise.then(() => {
                    console.warn('[ETA-Wetter] Timeout nach 8s → verwende Fallback-Werte');
                    return null;
                }),
            ]);

            if (!weatherResults) {
                // Timeout: Fallback-Werte bleiben, kein roter Fehler
                windHint.textContent = '⚡ Geschätztes Routenwetter (Live-Daten n.v.)';
                windHint.style.color = 'rgba(255,200,0,0.5)';
                return;
            }

            // Durchschnitt berechnen (nur valide Datenpunkte)
            let totalSpeed = 0, sinSum = 0, cosSum = 0, count = 0;
            weatherResults.forEach(w => {
                if (!w || w.windspeed_10m == null || w.winddirection_10m == null) return;
                totalSpeed += w.windspeed_10m;
                const rad = w.winddirection_10m * Math.PI / 180;
                sinSum += Math.sin(rad);
                cosSum += Math.cos(rad);
                count++;
            });

            if (count > 0) {
                const avgSpeed = Math.round(totalSpeed / count);
                const avgDir = Math.round(
                    ((Math.atan2(sinSum / count, cosSum / count) * 180 / Math.PI) + 360) % 360
                );

                // Nur übernehmen wenn Wert plausibel (> 0 und kein Ausreißer)
                if (avgSpeed >= 0 && avgSpeed < 200) {
                    windSpeedInput.value = avgSpeed;
                    windDirInput.value = avgDir;
                    windLabel.textContent = degToCompass(avgDir) + 'wind (' + avgDir + '°)';
                    updateWindArrow(avgDir);
                    const sourceLabel = etaIsPast
                        ? `📜 Historisch (${e.datum})`
                        : `🔴 Live`;
                    windHint.textContent = `⚡ ${sourceLabel} – ∅ ${count} Stationen`;
                    windHint.style.color = 'rgba(0,212,255,0.55)';
                } else {
                    // Ausreißer → Fallback-Werte behalten
                    windHint.textContent = '⚡ Routenwetter (Schätzwert)';
                    windHint.style.color = 'rgba(255,200,0,0.5)';
                }
            } else {
                // Keine validen Datenpunkte → Fallback-Werte behalten (kein roter Fehler!)
                windHint.textContent = '⚡ Routenwetter (Schätzwert – keine Live-Daten)';
                windHint.style.color = 'rgba(255,200,0,0.5)';
            }
        } catch (outerErr) {
            // Aeußerster Catch: NIEMALS roten Fehler zeigen, immer Fallback
            console.warn('[ETA-Wetter] Aeußerer Fehler (ignoriert):', outerErr.message);
            windHint.textContent = '⚡ Routenwetter (Schätzwert)';
            windHint.style.color = 'rgba(255,200,0,0.5)';
            // windSpeedInput und windDirInput behalten die bereits gesetzten Fallback-Werte
        }
    });

    // Windrichtungs-Label (readonly, wird nicht manuell geändert, aber sicherheitshalber)
    windDirInput.addEventListener('input', () => {
        const d = parseInt(windDirInput.value) || 0;
        windLabel.textContent = degToCompass(d) + 'wind (' + d + '°)';
        updateWindArrow(d);
    });

    // Öffnen / Schließen
    if (openBtn) openBtn.addEventListener('click', () => { overlay.style.display = 'block'; });
    if (closeBtn) closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

    // Berechnen
    calcBtn.addEventListener('click', () => {
        const idx = parseInt(ortSelect.value);
        if (isNaN(idx)) { alert('Bitte einen Auflassort wählen.'); return; }
        const entry = REISEPLAN_2026[idx];

        const releaseTimeStr = document.getElementById('eta-release-time').value; // "HH:MM"
        const vTaube = parseFloat(document.getElementById('eta-pigeon-speed').value) || 1500; // m/min
        const vWindKmh = parseFloat(document.getElementById('eta-wind-speed').value) || 0;
        const windDeg = parseFloat(windDirInput.value) || 0;

        // Aero-Vektor-Berechnung via calcWindEffect()
        const distM = haversine(entry.lat, entry.lon, HOME_LAT, HOME_LON);
        const aero = calcWindEffect(entry.lat, entry.lon, HOME_LAT, HOME_LON, vWindKmh, windDeg);
        const flightBearing = aero.flightBearing;
        const alpha = aero.alpha;

        // Groundspeed: Basis + Rückenwind-Komponente - 10% Seitenwind-Penalty
        const vGround = vTaube + aero.wEff - (aero.wSide * 0.1);
        if (vGround <= 0) { alert('Ungültige Parameter: Groundspeed ≤ 0.'); return; }

        const durationMin = distM / vGround;

        // Ankunftszeit berechnen
        const [hh, mm] = releaseTimeStr.split(':').map(Number);
        const releaseDate = new Date();
        releaseDate.setHours(hh, mm, 0, 0);
        const arrivalDate = new Date(releaseDate.getTime() + durationMin * 60000);

        const pad2 = n => String(n).padStart(2, '0');
        const arrivalStr = pad2(arrivalDate.getHours()) + ':' + pad2(arrivalDate.getMinutes());
        const durH = Math.floor(durationMin / 60);
        const durM = Math.round(durationMin % 60);

        // Ergebnis anzeigen
        document.getElementById('eta-res-dist').textContent = (distM / 1000).toFixed(1) + ' km';
        document.getElementById('eta-res-effspeed').textContent = vGround.toFixed(0) + ' m/min';
        document.getElementById('eta-res-duration').textContent = durH + 'h ' + durM + 'min';
        document.getElementById('eta-res-arrival').textContent = arrivalStr + ' Uhr';
        document.getElementById('eta-res-wind-info').textContent =
            `Wind: ${vWindKmh} km/h aus ${degToCompass(windDeg)} (${windDeg}°) | Flugrichtung: ${flightBearing.toFixed(0)}° | α = ${alpha.toFixed(0)}°`;

        // Aero-Windeffekt-Anzeige
        const aeroBox = document.getElementById('eta-aero-info');
        const aeroEffect = document.getElementById('eta-aero-effect');
        const aeroDetail = document.getElementById('eta-aero-detail');
        if (aeroBox && aeroEffect) {
            const netEffect = aero.wEff - (aero.wSide * 0.1);
            const sign = netEffect >= 0 ? '+' : '';
            const color = netEffect > 20 ? '#39ff14' : netEffect < -20 ? '#ff4444' : 'var(--gold)';
            aeroEffect.innerHTML = `<span style="color:${color};">Windeffekt: ${sign}${netEffect.toFixed(0)} m/min (${aero.windType})</span>`;
            aeroDetail.textContent = `Parallel: ${aero.wEff >= 0 ? '+' : ''}${aero.wEff.toFixed(0)} m/min | Seitenwind: ${aero.wSide.toFixed(0)} m/min (−${(aero.wSide * 0.1).toFixed(0)} Penalty) | cos(α) = ${Math.cos(aero.alpha * Math.PI / 180).toFixed(3)}`;
            aeroBox.style.display = 'block';
        }

        resultDiv.style.display = 'block';

    });
})();

// --- Prognose Tauben Modal ---
(function initPrognoseModal() {
    const overlay = document.getElementById('prognose-overlay');
    const openBtn = document.getElementById('prognose-btn');
    const closeBtn = document.getElementById('prognose-close');
    const flightSel = document.getElementById('prognose-flight-select');
    const loadingDiv = document.getElementById('prognose-loading');
    const resultsDiv = document.getElementById('prognose-results');
    const weatherInfo = document.getElementById('prognose-weather-info');
    const listDiv = document.getElementById('prognose-list');
    if (!overlay || !openBtn) return;

    // HOME-Koordinaten dynamisch aus aktivem Züchter

    // Bearing
    function bearingP(lat1, lon1, lat2, lon2) {
        const toRad = d => d * Math.PI / 180;
        const dLon = toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRad(lat2));
        const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
            - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    function haversineP(lat1, lon1, lat2, lon2) {
        const R = 6371000, toRad = d => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    const DIRS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    function degToCompassP(d) { return DIRS[Math.round(d / 22.5) % 16]; }

    // Dropdown befüllen
    flightSel.innerHTML = '<option value="">— Flug wählen —</option>';
    const seen = new Set();
    REISEPLAN_2026.forEach((e, i) => {
        const key = e.datum + '|' + e.ort;
        if (seen.has(key)) return;
        seen.add(key);
        const o = document.createElement('option');
        o.value = i;
        o.textContent = e.datum + ' – ' + e.ort + ' (' + e.km + ' km)';
        flightSel.appendChild(o);
    });

    // Öffnen / Schließen
    openBtn.addEventListener('click', () => {
        overlay.style.display = 'block';
        // Gewichtungs-Anzeige sofort mit aktuellen Werten initialisieren
        const _wInit = document.getElementById('prognose-weights-display');
        if (_wInit && typeof getWeights === 'function') {
            const _wDef = getWeights('Rückenwind');
            _wInit.textContent = `${_wDef.exp}% Erfahrung (Preise) + ${_wDef.form}% Form-Trend (letzte 3 Flüge) + ${_wDef.weather}% Wetter-Match`;
        }
    });
    closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

    // Flug gewählt → Prognose berechnen
    flightSel.addEventListener('change', async () => {
        const idx = parseInt(flightSel.value);
        if (isNaN(idx)) { resultsDiv.style.display = 'none'; return; }
        const entry = REISEPLAN_2026[idx];

        loadingDiv.style.display = 'block';
        resultsDiv.style.display = 'none';

        // --- 1. Routenwetter laden ---
        const dist = haversineP(entry.lat, entry.lon, HOME_LAT, HOME_LON);
        const flightBearing = bearingP(entry.lat, entry.lon, HOME_LAT, HOME_LON);
        let avgWindSpeed = 0, avgWindDir = 0, avgRain = 0;

        try {
            const seg = 50000;
            const numSeg = Math.floor(dist / seg);
            const wps = [{ lat: entry.lat, lon: entry.lon }];
            for (let i = 1; i <= numSeg; i++) {
                const f = (i * seg) / dist;
                wps.push({ lat: entry.lat + f * (HOME_LAT - entry.lat), lon: entry.lon + f * (HOME_LON - entry.lon) });
            }
            wps.push({ lat: HOME_LAT, lon: HOME_LON });

            const results = await Promise.all(wps.map(async wp => {
                const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lon}&current=windspeed_10m,winddirection_10m,precipitation`);
                return (await r.json()).current;
            }));

            let totalSpd = 0, sinS = 0, cosS = 0, totalRain = 0, cnt = 0;
            results.forEach(w => {
                if (!w) return;
                totalSpd += w.windspeed_10m;
                totalRain += (w.precipitation || 0);
                const rad = w.winddirection_10m * Math.PI / 180;
                sinS += Math.sin(rad); cosS += Math.cos(rad);
                cnt++;
            });
            if (cnt > 0) {
                avgWindSpeed = totalSpd / cnt;
                avgWindDir = ((Math.atan2(sinS / cnt, cosS / cnt) * 180 / Math.PI) + 360) % 360;
                avgRain = totalRain / cnt;
            }
        } catch (e) { console.warn('Prognose Wetter-Fehler:', e); }

        // Wind-Komponente auf Flugrichtung
        const windToDir = (avgWindDir + 180) % 360;
        let windAlpha = Math.abs(flightBearing - windToDir);
        if (windAlpha > 180) windAlpha = 360 - windAlpha;
        const windCos = Math.cos(windAlpha * Math.PI / 180); // +1 = Rückenwind, -1 = Gegenwind
        const windType = windCos > 0.3 ? 'Rückenwind' : windCos < -0.3 ? 'Gegenwind' : 'Seitenwind';

        const rainTag = avgRain > 0.2 ? ` | 🌧️ Regen: ${avgRain.toFixed(1)}mm` : '';
        weatherInfo.innerHTML = `💨 Route: ∅ ${avgWindSpeed.toFixed(0)} km/h aus ${degToCompassP(avgWindDir)} (${avgWindDir.toFixed(0)}°) | Flugrichtung: ${flightBearing.toFixed(0)}° | <strong style="color:${windCos > 0.3 ? 'var(--green)' : windCos < -0.3 ? 'var(--red)' : 'var(--gold)'}">${windType}</strong> (cos α = ${windCos.toFixed(2)})${rainTag}`;

        // --- 2. Alle Tauben sammeln und bewerten ---
        const riroFlights = appData.flights.filter(f => f.id && f.id.startsWith('riro_'));
        const totalFlightsInSeason = riroFlights.length;
        const allRings = new Set();
        riroFlights.forEach(f => (f.pigeons || []).forEach(p => { if (p.ringNumber) allRings.add(p.ringNumber); }));

        const pigeonScores = [];

        allRings.forEach(ring => {
            const norm = normalizeRing(ring);
            const flightData = []; // chronologisch

            riroFlights.forEach(f => {
                const p = f.pigeons.find(x => normalizeRing(x.ringNumber) === norm);
                if (!p) return;
                const speed = calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime);
                flightData.push({
                    speed,
                    asPoints: Number(p.asPoints) || 0,
                    prizesRV: Number(p.prizesRV) || 0
                });
            });

            if (!flightData.length) return;

            // === NEUER SCORE-ALGORITHMUS ===

            // A) Erfahrung (40%): Anzahl errungener Preise / Gesamtflüge
            const totalPrizes = flightData.reduce((s, d) => s + d.prizesRV, 0);
            const prizeRatio = totalFlightsInSeason > 0 ? totalPrizes / totalFlightsInSeason : 0;
            const expScore = prizeRatio * 100; // 100 = Preis in jedem Flug

            // B) Form-Trend (40%): Letzte 3 Flüge vs. Saison-Durchschnitt
            const seasonAvgAS = flightData.reduce((s, d) => s + d.asPoints, 0) / flightData.length;
            const last3 = flightData.slice(-3);
            const last3AvgAS = last3.reduce((s, d) => s + d.asPoints, 0) / last3.length;

            // Form-Prozent: wie viel besser/schlechter als Saisonschnitt
            let formPercent = 0;
            if (seasonAvgAS > 0) {
                formPercent = ((last3AvgAS - seasonAvgAS) / seasonAvgAS) * 100;
            }

            // Form-Arrow: ↑ (letzter Schnitt > Saison), → (≈gleich), ↓ (niedriger)
            let formArrow, formArrowRotation, formLabel;
            if (formPercent > 2) {
                formArrow = '↑'; formArrowRotation = 0; formLabel = 'steigend';
            } else if (formPercent < -2) {
                formArrow = '↓'; formArrowRotation = 180; formLabel = 'sinkend';
            } else {
                formArrow = '→'; formArrowRotation = 90; formLabel = 'stabil';
            }

            // Form-Score: 50 (neutral) + Bonus/Malus basierend auf Trend
            let formScore = 50 + formPercent; // z.B. +15% → 65
            formScore = Math.min(100, Math.max(0, formScore));

            // C) Wetter-Anpassung (20%): Wind-Match
            const avgSpeed = flightData.reduce((s, d) => s + d.speed, 0) / flightData.length;
            const speedNorm = Math.min(100, Math.max(0, (avgSpeed - 800) / 10));
            const asNorm = Math.min(100, seasonAvgAS);

            let weatherScore = 50;
            if (windCos > 0.3) {
                weatherScore = 40 + speedNorm * 0.6; // Rückenwind → schnelle Tauben
            } else if (windCos < -0.3) {
                weatherScore = 40 + asNorm * 0.6; // Gegenwind → robuste Tauben
            } else {
                weatherScore = 30 + (speedNorm * 0.3 + asNorm * 0.3); // Seitenwind → Allrounder
            }

            // Regen-Faktor: Niederschlag senkt den Weather-Score drastisch
            if (avgRain > 0.2) {
                const rainPenalty = avgRain > 3 ? 30 : avgRain > 1 ? 20 : 10;
                weatherScore = Math.max(0, weatherScore - rainPenalty);
            }

            // Duale Lernwege: Gewichtungen aus localStorage laden
            const _progWindType = windCos > 0.3 ? 'Rückenwind' : windCos < -0.3 ? 'Gegenwind' : 'Rückenwind';
            const _progW = (typeof getWeights === 'function') ? getWeights(_progWindType) : { exp: 40, form: 40, weather: 20 };
            const totalScore = expScore * (_progW.exp / 100) + formScore * (_progW.form / 100) + weatherScore * (_progW.weather / 100);

            // Begründung
            let reason = '';
            if (formPercent > 10 && windCos > 0.3) reason = '🔥 Top-Form & Windvorteil';
            else if (formPercent > 10) reason = '📈 Form steigt';
            else if (windCos > 0.3 && speedNorm > 60) reason = '💨 Rückenwind-Spezialist';
            else if (windCos < -0.3 && asNorm > 60) reason = '💪 Gegenwind-robust';
            else if (expScore >= 100) reason = '⭐ Volle Preisausbeute';
            else if (formPercent < -10) reason = '📉 Form sinkt';
            else reason = '✓ Solide Leistung';

            pigeonScores.push({
                ring, totalScore, expScore, formScore, weatherScore,
                totalPrizes, totalFlightsInSeason, avgSpeed, seasonAvgAS,
                last3AvgAS, formPercent, formArrow, formArrowRotation, formLabel,
                flights: flightData.length, reason
            });
        });

        // Top 10 sortieren
        pigeonScores.sort((a, b) => b.totalScore - a.totalScore);
        const top10 = pigeonScores.slice(0, 10);

        // --- 3. Ergebnis-Tabelle rendern ---
        listDiv.innerHTML = '';

        // Tabelle erstellen
        const table = document.createElement('table');
        table.style.cssText = 'width:100%; border-collapse:collapse; font-size:0.83rem;';
        table.innerHTML = `
            <thead>
                <tr style="border-bottom:2px solid rgba(0,212,255,0.2);">
                    <th style="padding:8px 5px; text-align:center; color:var(--cyan); font-size:0.72rem;">#</th>
                    <th style="padding:8px 5px; text-align:left; color:var(--cyan); font-size:0.72rem;">RINGNUMMER</th>
                    <th style="padding:8px 5px; text-align:center; color:var(--cyan); font-size:0.72rem;">ERF.</th>
                    <th style="padding:8px 5px; text-align:center; color:var(--cyan); font-size:0.72rem;">FORM</th>
                    <th style="padding:8px 5px; text-align:right; color:var(--cyan); font-size:0.72rem;">SCORE</th>
                    <th style="padding:8px 5px; text-align:left; color:var(--cyan); font-size:0.72rem; padding-left:12px;">BEWERTUNG</th>
                </tr>
            </thead>`;
        const tbody = document.createElement('tbody');

        const medals = ['🥇', '🥈', '🥉'];

        top10.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
            if (idx === 0) tr.style.background = 'rgba(0,160,230,0.1)';
            if (idx < 3) tr.style.background = `rgba(0,160,230,${0.1 - idx * 0.03})`;

            const medal = medals[idx] || (idx + 1);
            const endNr = p.ring.split(/[-\s]/).pop();
            const scoreColor = p.totalScore > 65 ? '#39ff14' : p.totalScore > 45 ? '#ffd700' : '#ff6b6b';
            const formArrowColor = p.formPercent > 10 ? '#39ff14' : p.formPercent < -10 ? '#ff4444' : '#ffd700';

            // SVG Pfeil mit Glow
            const arrowSvg = `<svg width="20" height="20" viewBox="0 0 24 24" style="transform:rotate(${p.formArrowRotation}deg); filter:drop-shadow(0 0 4px ${formArrowColor}); vertical-align:middle;" xmlns="http://www.w3.org/2000/svg"><polygon points="12,4 18,16 12,12 6,16" fill="${formArrowColor}"/></svg>`;

            tr.innerHTML = `
                <td style="padding:9px 5px; text-align:center; font-size:1.05rem;">${medal}</td>
                <td style="padding:9px 5px; color:#fff; font-weight:700; font-family:'Roboto Mono',monospace; font-size:0.85rem;">${endNr}<span style="color:rgba(255,255,255,0.25); font-weight:400; font-size:0.7rem; margin-left:4px;">${p.ring}</span></td>
                <td style="padding:9px 5px; text-align:center; color:${p.totalPrizes >= p.totalFlightsInSeason ? 'var(--green)' : 'rgba(255,255,255,0.6)'}; font-weight:700;">${p.totalPrizes}/${p.totalFlightsInSeason}</td>
                <td style="padding:9px 5px; text-align:center;">${arrowSvg}</td>
                <td style="padding:9px 5px; text-align:right; color:${scoreColor}; font-weight:800; font-size:0.95rem;">${p.totalScore.toFixed(1)}</td>
                <td style="padding:9px 5px; text-align:left; font-size:0.72rem; color:rgba(255,255,255,0.45); padding-left:12px;">${p.reason}</td>
            `;
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        listDiv.appendChild(table);

        loadingDiv.style.display = 'none';
        resultsDiv.style.display = 'block';

        // Gewichtungs-Anzeige aktualisieren
        const _wDisp = document.getElementById('prognose-weights-display');
        if (_wDisp && typeof getWeights === 'function') {
            const _wt2 = windCos > 0.3 ? 'Rückenwind' : windCos < -0.3 ? 'Gegenwind' : 'Rückenwind';
            const _w2 = getWeights(_wt2);
            _wDisp.textContent = `${_w2.exp}% Erfahrung (Preise) + ${_w2.form}% Form-Trend (letzte 3 Flüge) + ${_w2.weather}% Wetter-Match (${_wt2})`;
        }
        // Archiv-Dropdown befüllen
        if (typeof populateArchiveDropdown === 'function') populateArchiveDropdown();
    });
})();

// ============================================================
// HISTORY – Wetter-Performance-Analyse
// ============================================================
(function initHistoryModal() {
    const btn = document.getElementById('history-btn');
    const overlay = document.getElementById('history-overlay');
    const closeBtn = document.getElementById('history-close');
    const pigeonSelect = document.getElementById('history-pigeon-select');
    const resultsDiv = document.getElementById('history-results');
    const methodDiv = document.getElementById('history-method');
    if (!btn || !overlay) return;

    btn.addEventListener('click', () => {
        overlay.style.display = 'block';
        pigeonSelect.innerHTML = '<option value="">— Taube wählen —</option>';

        // W-Deduplication: normKey → { display } – W-Variante bevorzugt als Anzeige
        const ringMap = new Map();
        appData.flights.forEach(f => {
            (f.pigeons || []).forEach(p => {
                if (!p.ringNumber) return;
                const norm = normalizeRing(p.ringNumber);
                if (!ringMap.has(norm)) ringMap.set(norm, { display: p.ringNumber, prizes: 0 });
                // W-Variante als bevorzugten Anzeigenamen merken
                if (/W$/i.test(p.ringNumber.split(/[-\s]/).pop())) {
                    ringMap.get(norm).display = p.ringNumber;
                }
                
                // Preise der aktuellen Saison zählen (historische Flüge ignorieren)
                if (!f.id || !f.id.startsWith('hist_')) {
                    const preis = Number(p.prizesRV) || 0;
                    if (preis > 0) {
                        ringMap.get(norm).prizes += preis;
                    }
                }
            });
        });

        const withPrizes = [];
        const withoutPrizes = [];
        for (const e of ringMap.values()) {
            if (e.prizes > 0) withPrizes.push(e);
            else withoutPrizes.push(e);
        }

        // Numerisch nach Endnummer sortieren (W ignoriert)
        const sortFn = (a, b) => {
            const ea = (a.display.split(/[-\s]/).pop() || '').replace(/W$/i, '');
            const eb = (b.display.split(/[-\s]/).pop() || '').replace(/W$/i, '');
            return ea.localeCompare(eb, undefined, { numeric: true });
        };

        withPrizes.sort(sortFn);
        withoutPrizes.sort(sortFn);

        if (withPrizes.length > 0) {
            const groupPrizes = document.createElement('optgroup');
            groupPrizes.label = '— 🏆 SAISONPREISE —';
            withPrizes.forEach(e => {
                const o = document.createElement('option');
                o.value = e.display;
                o.textContent = `⭐ ${e.display}`;
                groupPrizes.appendChild(o);
            });
            pigeonSelect.appendChild(groupPrizes);
        }

        if (withoutPrizes.length > 0) {
            const groupNoPrizes = document.createElement('optgroup');
            groupNoPrizes.label = '— OHNE PREISE —';
            withoutPrizes.forEach(e => {
                const o = document.createElement('option');
                o.value = e.display;
                o.textContent = e.display;
                groupNoPrizes.appendChild(o);
            });
            pigeonSelect.appendChild(groupNoPrizes);
        }

        resultsDiv.style.display = 'none';
        methodDiv.style.display = 'none';
    });


    closeBtn.addEventListener('click', () => overlay.style.display = 'none');
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

    pigeonSelect.addEventListener('change', async () => {
        const ring = pigeonSelect.value;
        if (!ring) { resultsDiv.style.display = 'none'; methodDiv.style.display = 'none'; return; }
        const normRing = normalizeRing(ring);

        resultsDiv.style.display = 'none';
        methodDiv.style.display = 'none';
        const loadingDiv = document.getElementById('history-loading');
        if (loadingDiv) loadingDiv.style.display = 'block';

        const flightPromises = appData.flights.map(async f => {
            const p = f.pigeons ? f.pigeons.find(x => normalizeRing(x.ringNumber) === normRing) : null;
            if (!p) return null;
            
            const speed = calculateSpeed(f.distanceMeters, f.releaseTime, p.arrivalTime);
            const pts = Number(p.asPoints) || 0;
            
            let temp = null;
            let hasRain = false;
            let windDir = null;
            let wd = 0;

            let relDate = f.releaseTime ? f.releaseTime.split('T')[0] : null;
            if (!relDate) {
                const match = (f.name||'').match(/(\d{2})\.(\d{2})\.(\d{4})/);
                if (match) relDate = `${match[3]}-${match[2]}-${match[1]}`;
            }

            let lat = f.releaseLat;
            let lon = f.releaseLon;
            if (relDate && (!lat || !lon)) {
                const cityMatch = (f.name||'').match(/\d{2}\.\d{2}\.\d{4}\s+(.*?)\s+\(\d+/);
                if (cityMatch && cityMatch[1]) {
                    const city = cityMatch[1].split('-')[0].trim();
                    try {
                        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`);
                        const geoData = await geoRes.json();
                        if (geoData.results && geoData.results.length > 0) {
                            lat = geoData.results[0].latitude;
                            lon = geoData.results[0].longitude;
                            f.releaseLat = lat;
                            f.releaseLon = lon;
                        }
                    } catch (e) {}
                }
            }

            if (relDate && lat && lon) {
                if (!f.histWeatherCache) {
                    try {
                        const today = new Date();
                        const fDate = new Date(relDate);
                        const diffDays = (today - fDate) / (1000 * 60 * 60 * 24);
                        const baseUrl = diffDays <= 7 ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive';
                        const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${relDate}&end_date=${relDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode`;
                        const res = await fetch(url);
                        const data = await res.json();
                        let hourIdx = 9;
                        if (f.releaseTime && f.releaseTime.includes('T')) {
                            hourIdx = parseInt(f.releaseTime.split('T')[1].split(':')[0]);
                        }
                        if (data.hourly && data.hourly.temperature_2m) {
                            f.histWeatherCache = {
                                temp: data.hourly.temperature_2m[hourIdx],
                                windDirDeg: data.hourly.winddirection_10m[hourIdx],
                                precip: data.hourly.precipitation[hourIdx],
                                wcode: data.hourly.weathercode[hourIdx]
                            };
                        } else {
                            f.histWeatherCache = { error: true };
                        }
                    } catch (e) {
                        f.histWeatherCache = { error: true };
                    }
                }
                
                if (f.histWeatherCache && !f.histWeatherCache.error) {
                    temp = Math.round(f.histWeatherCache.temp);
                    hasRain = f.histWeatherCache.precip > 0.2 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(f.histWeatherCache.wcode);
                    wd = f.histWeatherCache.windDirDeg;
                    const dirs = ["N","NNO","NO","ONO","O","OSO","SO","SSO","S","SSW","SW","WSW","W","WNW","NW","NNW","N"];
                    windDir = dirs[Math.round((wd % 360) / 22.5)];
                }
            }

            if (temp === null) {
                const weatherStr = ((f.weather && f.weather.release) || '') + ' ' + ((f.weather && f.weather.home) || '');
                const tempMatch = weatherStr.match(/(\d+)\s*°?\s*C/i);
                if (tempMatch) temp = parseInt(tempMatch[1]);
                hasRain = /regen|rain|schauer|nass/i.test(weatherStr) || (f.weather && f.weather.precipitation > 0.2);
                const windDirMatch = weatherStr.match(/\b(N|NO|O|SO|S|SW|W|NW|NNO|ONO|OSO|SSO|SSW|WSW|WNW|NNW)\b/i);
                if (windDirMatch) windDir = windDirMatch[1].toUpperCase();
                
                if (windDir) {
                    const dirDeg = { N: 0, NNO: 22, NO: 45, ONO: 67, O: 90, OSO: 112, SO: 135, SSO: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337 };
                    wd = dirDeg[windDir] || 0;
                }
            }

            let windType = 'neutral';
            if (windDir !== null) {
                if (wd >= 135 && wd <= 225) windType = 'tail';
                else if (wd >= 315 || wd <= 45) windType = 'head';
                else windType = 'cross';
            }
            const rvPlatz = p.rvPlatz === 'EF' ? 'EF' : (Number(p.rvPlatz) || 0);
            return { name: f.name, speed, pts, temp, hasRain, windDir, windType, rvPlatz };
        });

        const flightsResult = await Promise.all(flightPromises);
        const flights = flightsResult.filter(f => f !== null);

        if (loadingDiv) loadingDiv.style.display = 'none';

        if (flights.length < 2) {
            resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Zu wenige Flugdaten für eine Analyse (mind. 2 Flüge nötig)</div>';
            resultsDiv.style.display = 'block'; methodDiv.style.display = 'none'; return;
        }

        // Preis-Flüge: nur Flüge mit tatsächlichem Preis (AS-Punkte > 0)
        const prizeFlights = flights.filter(f => f.pts > 0);
        const prizeCount = prizeFlights.length;

        // Durchschnitte NUR aus Preis-Flügen (unverzerrter Leistungsdurchschnitt)
        const avgSpeed = prizeCount > 0
            ? prizeFlights.reduce((s, f) => s + f.speed, 0) / prizeCount
            : flights.reduce((s, f) => s + f.speed, 0) / flights.length;
        const avgPts = prizeCount > 0
            ? prizeFlights.reduce((s, f) => s + f.pts, 0) / prizeCount
            : 0;

        // Gesamt-Speed-Durchschnitt (alle Flüge, für Wind-Vergleich)
        const totalAvgSpeed = flights.reduce((s, f) => s + f.speed, 0) / flights.length;

        const findings = [];

        // 1) Regen vs. Trocken (alle Flüge für Vergleich)
        const rainF = flights.filter(f => f.hasRain), dryF = flights.filter(f => !f.hasRain);
        if (rainF.length > 0 && dryF.length > 0) {
            const rainAvg = rainF.reduce((s, f) => s + f.speed, 0) / rainF.length;
            const dryAvg = dryF.reduce((s, f) => s + f.speed, 0) / dryF.length;
            const diff = ((rainAvg - dryAvg) / dryAvg * 100).toFixed(0);
            findings.push({ icon: '🌧️', category: 'Regen vs. Trocken', detail: `${rainF.length} Regenflüge, ${dryF.length} trockene`, verdict: diff > 0 ? `Kein Problem: +${diff}% bei Regen` : `⚠️ Leistungsabfall von ${Math.abs(diff)}% bei Regen`, positive: diff >= 0 });
        }

        // 2) Wind-Spezialisierung (ALLE historischen Flüge)
        const tailF = flights.filter(f => f.windType === 'tail'), headF = flights.filter(f => f.windType === 'head');
        if (tailF.length > 0 || headF.length > 0) {
            const tailAvg = tailF.length > 0 ? tailF.reduce((s, f) => s + f.speed, 0) / tailF.length : 0;
            const headAvg = headF.length > 0 ? headF.reduce((s, f) => s + f.speed, 0) / headF.length : 0;
            let bestType = tailAvg > headAvg ? 'Rückenwind' : 'Gegenwind';
            const bestAvg = Math.max(tailAvg, headAvg);
            const bonus = totalAvgSpeed > 0 ? ((bestAvg - totalAvgSpeed) / totalAvgSpeed * 100).toFixed(0) : '0';
            findings.push({ icon: '💨', category: 'Wind-Spezialisierung', detail: `Rücken: ${tailF.length}x (∅${tailAvg.toFixed(0)} m/min) | Gegen: ${headF.length}x (∅${headAvg.toFixed(0)} m/min) — Saison-∅: ${totalAvgSpeed.toFixed(0)}`, verdict: bestType === 'Rückenwind' ? `Rückenwind-Spezialist: +${bonus}% über Saison-∅` : `💪 Gegenwind-Kämpfer: +${bonus}% über Saison-∅`, positive: true });
        }

        // 3) Temperatur (alle Flüge)
        const hotF = flights.filter(f => f.temp !== null && f.temp > 25), coolF = flights.filter(f => f.temp !== null && f.temp <= 25);
        if (hotF.length > 0 && coolF.length > 0) {
            const hotAvg = hotF.reduce((s, f) => s + f.speed, 0) / hotF.length;
            const coolAvg = coolF.reduce((s, f) => s + f.speed, 0) / coolF.length;
            const diff = ((hotAvg - coolAvg) / coolAvg * 100).toFixed(0);
            findings.push({ icon: '🌡️', category: 'Temperatur-Einfluss', detail: `${hotF.length}x Hitze (>25°C), ${coolF.length}x kühl (≤25°C)`, verdict: diff > 0 ? `☀️ Hitze-Profiteur: +${diff}% bei Wärme` : `❄️ Bevorzugt kühl: ${Math.abs(diff)}% schneller bei ≤25°C`, positive: diff >= -5 });
        }

        const bestFlight = flights.reduce((a, b) => a.pts > b.pts ? a : b);
        const ptsFlights = flights.filter(f => f.pts > 0);
        const worstFlight = ptsFlights.length > 0 ? ptsFlights.reduce((a, b) => a.pts < b.pts ? a : b) : flights[flights.length - 1];

        // Statistik-Karten: "Preise" statt "Flüge" + nur Preis-Flüge für Durchschnitte
        let html = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
            <div style="background:rgba(0,0,0,0.25);border-radius:var(--r-sm);padding:10px;text-align:center;"><div style="font-size:0.7rem;color:rgba(255,255,255,0.45);">Flüge</div><div style="font-size:1.2rem;font-weight:800;color:var(--cyan);">${flights.length}</div></div>
            <div style="background:rgba(0,0,0,0.25);border-radius:var(--r-sm);padding:10px;text-align:center;"><div style="font-size:0.7rem;color:rgba(255,255,255,0.45);">∅ M/Min</div><div style="font-size:1.2rem;font-weight:800;color:var(--cyan);">${avgSpeed.toFixed(0)}</div></div>
            <div style="background:rgba(0,0,0,0.25);border-radius:var(--r-sm);padding:10px;text-align:center;"><div style="font-size:0.7rem;color:rgba(255,255,255,0.45);">∅ AS-Pkt</div><div style="font-size:1.2rem;font-weight:800;color:var(--cyan);">${avgPts.toFixed(1)}</div></div>
        </div>`;

        if (findings.length > 0) {
            findings.forEach(f => {
                const bc = f.positive ? 'rgba(57,255,20,0.2)' : 'rgba(255,68,68,0.2)';
                const bg = f.positive ? 'rgba(57,255,20,0.05)' : 'rgba(255,68,68,0.05)';
                const vc = f.positive ? '#39FF14' : '#ff4444';
                html += `<div style="background:${bg};border:1px solid ${bc};border-radius:var(--r-sm);padding:14px;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:1.3rem;">${f.icon}</span><span style="font-weight:700;color:#fff;font-size:0.9rem;">${f.category}</span></div>
                    <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-bottom:6px;">${f.detail}</div>
                    <div style="font-size:0.88rem;font-weight:700;color:${vc};filter:drop-shadow(0 0 8px ${vc}40);">${f.verdict}</div>
                </div>`;
            });
        } else {
            html += '<div style="text-align:center;padding:15px;color:rgba(255,255,255,0.4);font-size:0.85rem;">Keine Wetterdaten in den bisherigen Flügen hinterlegt.</div>';
        }

        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
            <div style="background:rgba(57,255,20,0.06);border:1px solid rgba(57,255,20,0.15);border-radius:var(--r-sm);padding:10px;"><div style="font-size:0.7rem;color:#39FF14;margin-bottom:4px;">🏆 Bester Flug</div><div style="font-size:0.85rem;font-weight:700;color:#fff;">${bestFlight.name}</div><div style="font-size:0.78rem;color:rgba(255,255,255,0.5);">${bestFlight.speed.toFixed(0)} m/min • ${bestFlight.pts.toFixed(1)} AS</div></div>
            <div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.15);border-radius:var(--r-sm);padding:10px;"><div style="font-size:0.7rem;color:#ff4444;margin-bottom:4px;">📉 Schwächster</div><div style="font-size:0.85rem;font-weight:700;color:#fff;">${worstFlight.name}</div><div style="font-size:0.78rem;color:rgba(255,255,255,0.5);">${worstFlight.speed.toFixed(0)} m/min • ${worstFlight.pts.toFixed(1)} AS</div></div>
        </div>`;

        // Tabelle zeigt ALLE Flüge (inkl. ohne Preis) – mit RV-Platzierung
        html += `<div style="margin-top:14px;overflow-x:auto;"><table class="modal-table"><thead><tr><th>Flug</th><th style="text-align:center;color:var(--gold);">RV</th><th style="text-align:right;">M/Min</th><th style="text-align:right;">AS</th><th style="text-align:center;">Wetter</th></tr></thead><tbody>${flights.map(f => {
            const rvCell = f.rvPlatz === 'EF' ? '<span style="color:rgba(255,255,255,0.3);font-size:0.7rem;">EF</span>' : (f.rvPlatz > 0 ? f.rvPlatz : '—');
            return `<tr style="${f.pts <= 0 ? 'opacity:0.4;' : ''}"><td style="font-size:0.8rem;">${f.name}</td><td style="text-align:center;color:var(--gold);font-weight:700;">${rvCell}</td><td style="text-align:right;font-weight:700;color:var(--cyan);">${f.speed.toFixed(0)}</td><td style="text-align:right;color:${f.pts > 0 ? '#39FF14' : 'rgba(255,255,255,0.3)'};font-weight:600;">${f.pts.toFixed(1)}</td><td style="text-align:center;font-size:0.78rem;color:rgba(255,255,255,0.5);">${f.hasRain ? '🌧️' : '☀️'} ${f.windDir || '-'} ${f.temp !== null ? f.temp + '°' : ''}</td></tr>`;
        }).join('')}</tbody></table></div>`;

        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
        methodDiv.style.display = 'block';
    });
})();

// =============================================================
// MULTI-ZÜCHTER-SYSTEM – 4-stufige Kaskade: RegV → RV → Verein → Züchter
// HYBRID: Lokale Daten (RegV 403) + Dynamische API (ganz Deutschland)
// Auto-Sync beim Züchter-Wechsel (clearAllBreederData + autoSync)
// =============================================================
(function initMultiBreederSystem() {

    const regvSelect = document.getElementById('regv-select');
    const rvSelect = document.getElementById('rv-select');
    const vereinSelect = document.getElementById('verein-select');
    const zuchterSelect = document.getElementById('zuchter-select');
    const breederName = document.getElementById('breeder-name');
    const breederPersNr = document.getElementById('breeder-persnr');
    const breederCoords = document.getElementById('breeder-coords');
    const locationLink = document.getElementById('location-maps-link');
    const locationCity = document.getElementById('location-city-name');
    const extractorDiv = document.getElementById('pigeon-extractor-status');
    const extractorCnt = document.getElementById('extractor-count');
    const autoSyncBadge = document.getElementById('auto-sync-status');

    // Spinner-Elemente
    const spinnerRegv = document.getElementById('spinner-regv');
    const spinnerRv = document.getElementById('spinner-rv');
    const spinnerVerein = document.getElementById('spinner-verein');
    const spinnerZuechter = document.getElementById('spinner-zuechter');

    // Stammdaten-Karte Elemente
    const stammdatenCard = document.getElementById('stammdaten-card');
    const stammdatenLoading = document.getElementById('stammdaten-loading');
    const stammdatenCoordsSec = document.getElementById('stammdaten-coords-section');
    const stammLat = document.getElementById('stamm-lat');
    const stammLon = document.getElementById('stamm-lon');
    const stammMapsLink = document.getElementById('stamm-maps-link');
    const stammCoordsRaw = document.getElementById('stamm-coords-raw');
    const reiseplanSection = document.getElementById('stammdaten-reiseplan-section');
    const reiseplanBody = document.getElementById('reiseplan-body');
    const reiseplanSummary = document.getElementById('reiseplan-summary');

    if (!vereinSelect || !zuchterSelect) return;

    // ── Kaskaden-State ────────────────────────────────────────────
    let currentRegvParam = '';   // z.B. "403Bochum und Umgebung"
    let currentRvId = '';   // z.B. "40306"
    let currentVeId = '';   // z.B. "46"
    let isLocalRegv = true; // true = RegV aus lokalem RV_REGISTRY

    function showSpinner(el) { if (el) el.style.display = 'inline-block'; }
    function hideSpinner(el) { if (el) el.style.display = 'none'; }
    function hideStammdatenCard() {
        if (stammdatenCard) stammdatenCard.style.display = 'none';
        if (stammdatenCoordsSec) stammdatenCoordsSec.style.display = 'none';
        if (reiseplanSection) reiseplanSection.style.display = 'none';
        if (stammdatenLoading) stammdatenLoading.style.display = 'none';
    }

    // ── STUFE 1: RegV (Hybrid: lokal sofort + API anreichern) ────
    if (regvSelect) {
        // Sofort: lokale RegVs (0 Latenz)
        RV_REGISTRY.forEach(rv => {
            const o = document.createElement('option');
            o.value = rv.regvRiRoParam;
            o.textContent = rv.regvName;
            o.dataset.localId = rv.regvId;
            regvSelect.appendChild(o);
        });
        const activeRegV = getActiveRegV();
        regvSelect.value = activeRegV.regvRiRoParam;
        currentRegvParam = activeRegV.regvRiRoParam;
        isLocalRegv = true;

        // Parallel: alle RegVs Deutschlands von API nachladen
        showSpinner(spinnerRegv);
        fetch('/api/riro-regv').then(r => r.json()).then(data => {
            if (!data.success || !data.data.length) return;
            const existing = new Set();
            for (const opt of regvSelect.options) existing.add(opt.value);
            data.data.forEach(regv => {
                if (!existing.has(regv.id)) {
                    const o = document.createElement('option');
                    o.value = regv.id;
                    o.textContent = regv.name;
                    regvSelect.appendChild(o);
                }
            });
            console.log(`[Kaskade] ${data.data.length} RegVs von API, ${regvSelect.options.length - 1} total`);
        }).catch(e => console.warn('[Kaskade] RegV-API:', e))
            .finally(() => hideSpinner(spinnerRegv));

        regvSelect.addEventListener('change', () => {
            currentRegvParam = regvSelect.value;
            const localMatch = RV_REGISTRY.find(r => r.regvRiRoParam === currentRegvParam);
            isLocalRegv = !!localMatch;
            populateRvDropdown(currentRegvParam);
        });
    }

    // ── STUFE 2: RV (Hybrid) ─────────────────────────────────────
    async function populateRvDropdown(regvParam) {
        if (!rvSelect) { if (isLocalRegv) populateVereinDropdown(ACTIVE_RV.rvId); return; }
        rvSelect.innerHTML = '<option value="">— RV wählen —</option>';
        vereinSelect.innerHTML = '<option value="">— Erst RV wählen —</option>';
        vereinSelect.disabled = true;
        zuchterSelect.innerHTML = '<option value="">— Erst Verein wählen —</option>';
        zuchterSelect.disabled = true;
        hideStammdatenCard();

        const localRegv = RV_REGISTRY.find(r => r.regvRiRoParam === regvParam);
        if (localRegv) {
            localRegv.rvs.forEach(rv => {
                const o = document.createElement('option');
                o.value = rv.rvId;
                o.textContent = rv.rvName;
                rvSelect.appendChild(o);
            });
            rvSelect.disabled = false;
            const match = localRegv.rvs.find(rv => rv.rvId === ACTIVE_RV.rvId);
            if (match) {
                rvSelect.value = ACTIVE_RV.rvId;
                currentRvId = ACTIVE_RV.rvId;
                populateVereinDropdown(ACTIVE_RV.rvId);
            }
        } else {
            rvSelect.innerHTML = '<option value="">⏳ Lade RVs…</option>';
            rvSelect.disabled = true;
            showSpinner(spinnerRv);
            try {
                const resp = await fetch(`/api/riro-rv?regv=${encodeURIComponent(regvParam)}`);
                const data = await resp.json();
                rvSelect.innerHTML = '<option value="">— RV wählen —</option>';
                if (data.success && data.data.length) {
                    data.data.forEach(rv => {
                        const o = document.createElement('option');
                        o.value = rv.id;
                        o.textContent = `RV ${rv.id.replace(/^(\d{3})(\d{2,3})$/, '$1/$2')} ${rv.name}`;
                        rvSelect.appendChild(o);
                    });
                    rvSelect.disabled = false;
                    showToast(`✅ ${data.data.length} RVs geladen`, 'success', 2500);
                } else {
                    rvSelect.innerHTML = '<option value="">— Keine RVs gefunden —</option>';
                }
            } catch (e) {
                console.error('[Kaskade] RV-API:', e);
                rvSelect.innerHTML = '<option value="">— Fehler —</option>';
            } finally { hideSpinner(spinnerRv); }
        }
    }

    if (rvSelect) {
        rvSelect.addEventListener('change', () => {
            const rvId = rvSelect.value;
            if (!rvId) return;
            currentRvId = rvId;
            for (const regv of RV_REGISTRY) {
                const found = regv.rvs.find(rv => rv.rvId === rvId);
                if (found) { ACTIVE_RV = found; break; }
            }
            const rvBadge = document.getElementById('breeder-rv-badge');
            if (rvBadge) {
                if (ACTIVE_RV && ACTIVE_RV.origrvnr && ACTIVE_RV.rvId === rvId) {
                    rvBadge.textContent = `RV ${ACTIVE_RV.origrvnr.replace(/^(\d{3})(\d{2})$/, '$1/$2')}`;
                } else {
                    rvBadge.textContent = `RV ${rvId.replace(/^(\d{3})(\d{2,3})$/, '$1/$2')}`;
                }
            }
            populateVereinDropdown(rvId);
        });
    }

    // ── STUFE 3: Verein (Unified: Cache oder Stammdaten-API) ─────────────────────────────────
    // ── STUFE 3: Verein (Unified: Cache oder Stammdaten-API) ─────────────────────────────────
    async function populateVereinDropdown(rvId) {
        vereinSelect.innerHTML = '<option value="">— Verein wählen —</option>';
        zuchterSelect.innerHTML = '<option value="">— Erst Verein wählen —</option>';
        zuchterSelect.disabled = true;
        hideStammdatenCard();

        let rvMembers = ALL_RV_MEMBERS.filter(m => m.rvId === rvId);

        if (rvMembers.length > 0) {
            // Lokale/gecachte Daten vorhanden → sofort rendern (0 Latenz)
            fillVereinSelect(rvMembers, rvId);
        } else {
            // Keine lokalen Daten → Stammdaten-API (fuer ALLE RegVs)
            vereinSelect.innerHTML = '<option value="">⏳ Lade Vereine + Züchter…</option>';
            vereinSelect.disabled = true;
            showSpinner(spinnerVerein);
            try {
                const newMembers = await fetchMembersFromStammdaten(rvId);
                if (newMembers.length > 0) {
                    // Deduplizieren vor dem Einfuegen
                    const existingKeys = new Set(
                        ALL_RV_MEMBERS.map(m => m.rvId + '|' + m.persNr)
                    );
                    const deduped = newMembers.filter(
                        m => !existingKeys.has(m.rvId + '|' + m.persNr)
                    );
                    ALL_RV_MEMBERS.push(...deduped);
                    fillVereinSelect(newMembers, rvId);
                    showToast(`✅ ${newMembers.length} Züchter geladen`, 'success');
                } else {
                    vereinSelect.innerHTML = '<option value="">— Keine Daten —</option>';
                    vereinSelect.disabled = true;
                    showToast('ℹ️ Keine Züchter für diese RV gefunden', 'warn');
                }
            } catch (e) {
                console.error('[Kaskade] Stammdaten-Members:', e);
                vereinSelect.innerHTML = '<option value="">— Fehler beim Laden —</option>';
                vereinSelect.disabled = true;
                showToast('⚠️ Stammdaten konnten nicht geladen werden', 'warn');
            } finally {
                hideSpinner(spinnerVerein);
            }
        }
    }
    function fillVereinSelect(rvMembers, rvId) {
        vereinSelect.innerHTML = '<option value="">— Verein wählen —</option>';
        const vereinMap = {};
        rvMembers.forEach(m => {
            const key = m.verein + '|' + m.vereinName;
            if (!vereinMap[key]) vereinMap[key] = { verein: m.verein, name: m.vereinName };
        });
        Object.values(vereinMap)
            .sort((a, b) => a.name.localeCompare(b.name, 'de'))
            .forEach(v => {
                const o = document.createElement('option');
                o.value = v.verein;
                o.textContent = `${v.name} (${v.verein})`;
                vereinSelect.appendChild(o);
            });
        vereinSelect.disabled = false;
        if (ACTIVE_BREEDER.rvId === rvId) {
            vereinSelect.value = ACTIVE_BREEDER.verein;
            populateZuchterDropdown(ACTIVE_BREEDER.verein);
            zuchterSelect.value = ACTIVE_BREEDER.persNr;
        }
    }

    vereinSelect.addEventListener('change', () => {
        currentVeId = vereinSelect.value;
        populateZuchterDropdown(vereinSelect.value);
    });

    // ── STUFE 4: Züchter (Hybrid) ────────────────────────────────
    async function populateZuchterDropdown(vereinId) {
        zuchterSelect.innerHTML = '<option value="">— Züchter wählen —</option>';
        hideStammdatenCard();
        if (!vereinId) { zuchterSelect.disabled = true; return; }
        currentVeId = vereinId;
        const rvId = currentRvId || ACTIVE_RV.rvId;

        const members = ALL_RV_MEMBERS.filter(m => m.rvId === rvId && m.verein === vereinId);
        if (members.length > 0) {
            members.forEach(m => {
                const o = document.createElement('option');
                o.value = m.persNr;
                o.textContent = `${m.persNr} – ${m.name}`;
                zuchterSelect.appendChild(o);
            });
            zuchterSelect.disabled = false;
            if (members.length === 1) {
                zuchterSelect.value = members[0].persNr;
                applyBreederChange(members[0], false);
            }
        } else if (!isLocalRegv) {
            // Remote → Züchter-API
            zuchterSelect.innerHTML = '<option value="">⏳ Lade Züchter…</option>';
            zuchterSelect.disabled = true;
            showSpinner(spinnerZuechter);
            try {
                const resp = await fetch(`/api/riro-zuechter?regv=${encodeURIComponent(currentRegvParam)}&rv=${rvId}&ve=${vereinId}`);
                const data = await resp.json();
                zuchterSelect.innerHTML = '<option value="">— Züchter wählen —</option>';
                if (data.success && data.data.length) {
                    data.data.forEach(z => {
                        const o = document.createElement('option');
                        o.value = z.id;
                        o.textContent = z.name;
                        o.dataset.ve = z.ve;
                        zuchterSelect.appendChild(o);
                    });
                    zuchterSelect.disabled = false;
                    showToast(`✅ ${data.data.length} Züchter geladen`, 'success', 2500);
                } else {
                    zuchterSelect.innerHTML = '<option value="">— Keine Züchter —</option>';
                }
            } catch (e) {
                zuchterSelect.innerHTML = '<option value="">— Fehler —</option>';
            } finally { hideSpinner(spinnerZuechter); }
        } else {
            zuchterSelect.disabled = true;
        }
    }

    // ── Züchter-Wechsel: Stammdaten laden + applyBreederChange ───
    zuchterSelect.addEventListener('change', async () => {
        const val = zuchterSelect.value;
        if (!val) return;
        const rvId = currentRvId || ACTIVE_RV.rvId;

        // Lokaler Züchter?
        const localMember = ALL_RV_MEMBERS.find(m => m.rvId === rvId && m.persNr === val);
        if (localMember) {
            applyBreederChange(localMember, true);
            loadAndShowStammdaten(currentRegvParam || getActiveRegV().regvRiRoParam, rvId, localMember.name);
            return;
        }

        // Remote Züchter → Stammdaten laden, dann Member-Objekt erstellen
        const zuechterName = val;
        showToast(`🔍 Lade Stammdaten für ${zuechterName}…`, 'info', 3000);
        const stamm = await loadAndShowStammdaten(currentRegvParam, rvId, zuechterName);

        const tempMember = {
            rvId, persNr: 'remote', name: zuechterName,
            verein: currentVeId, vereinName: `VE ${currentVeId}`,
            latRiro: '000000,0', lonRiro: '000000,0', dvNr: ''
        };
        if (stamm && stamm.koordinaten) {
            tempMember.latRiro = stamm.koordinaten.breiteRaw || '000000,0';
            tempMember.lonRiro = stamm.koordinaten.laengeRaw || '000000,0';
            tempMember.persNr = stamm.koordinaten.vvznr || 'remote';
        }
        if (!ALL_RV_MEMBERS.find(m => m.rvId === rvId && m.name === zuechterName)) {
            ALL_RV_MEMBERS.push(tempMember);
        }
        applyBreederChange(tempMember, true);
    });

    // ── Stammdaten laden & Reiseplan-Karte rendern ───────────────
    async function loadAndShowStammdaten(regvParam, rvId, zuechterName) {
        if (!stammdatenCard) return null;
        stammdatenCard.style.display = 'block';
        if (stammdatenLoading) stammdatenLoading.style.display = 'block';
        if (stammdatenCoordsSec) stammdatenCoordsSec.style.display = 'none';
        if (reiseplanSection) reiseplanSection.style.display = 'none';

        try {
            const rp = regvParam || getActiveRegV().regvRiRoParam;
            const resp = await fetch(`/api/riro-stammdaten?regv=${encodeURIComponent(rp)}&rv=${rvId}&zuechter=${encodeURIComponent(zuechterName)}`);
            const data = await resp.json();
            if (stammdatenLoading) stammdatenLoading.style.display = 'none';

            if (!data.success) {
                stammdatenCard.style.display = 'none';
                return null;
            }

            // Koordinaten anzeigen
            if (data.koordinaten && stammdatenCoordsSec) {
                const k = data.koordinaten;
                if (stammLat) stammLat.textContent = k.breite.toFixed(4) + '°';
                if (stammLon) stammLon.textContent = k.laenge.toFixed(4) + '°';
                if (stammMapsLink) {
                    stammMapsLink.href = 'javascript:void(0)';
                    stammMapsLink.onclick = (e) => { e.preventDefault(); openMaps(k.breite, k.laenge, 'Schlag-Standort'); };
                }
                if (stammCoordsRaw) stammCoordsRaw.textContent = `RiRo: B ${k.breiteRaw}  L ${k.laengeRaw}`;
                stammdatenCoordsSec.style.display = 'block';
            }

            // Reiseplan rendern
            if (data.reiseplan && data.reiseplan.length && reiseplanBody && reiseplanSection) {
                reiseplanBody.innerHTML = '';
                let doneCount = 0;
                data.reiseplan.forEach(r => {
                    if (r.hatPreisliste) doneCount++;
                    const tr = document.createElement('tr');
                    tr.className = r.hatPreisliste ? 'rp-done' : 'rp-future';
                    tr.innerHTML = `<td>${r.datum}</td><td>${r.platz}</td><td style="text-align:right;font-weight:600;">${r.km || '–'}</td><td>${r.kw}</td><td style="font-size:0.72rem;opacity:0.6;">${r.reise || ''}</td>`;
                    reiseplanBody.appendChild(tr);
                });
                if (reiseplanSummary) reiseplanSummary.textContent = `${doneCount} geflogen / ${data.reiseplan.length} gesamt`;
                reiseplanSection.style.display = 'block';

                // REISEPLAN_2026 dynamisch aktualisieren (für ETA-Modal)
                if (data.reiseplan.length > 0 && !isLocalRegv) {
                    REISEPLAN_2026.length = 0;
                    data.reiseplan.forEach(r => {
                        if (!r.datum || !/^\d{2}\.\d{2}\.\d{4}$/.test(r.datum)) return;
                        REISEPLAN_2026.push({
                            datum: r.datum, ort: r.platz || '?',
                            km: r.km || 0, lat: 0, lon: 0
                        });
                    });
                    console.log(`[Kaskade] REISEPLAN_2026 dynamisch aktualisiert: ${REISEPLAN_2026.length} Einträge`);
                }
            }

            showToast(`📋 Stammdaten geladen`, 'success', 2000);
            return data;
        } catch (e) {
            console.error('[Stammdaten] Fehler:', e);
            if (stammdatenLoading) stammdatenLoading.style.display = 'none';
            stammdatenCard.style.display = 'none';
            return null;
        }
    }

    // ── Züchter-Wechsel anwenden (bestehende Logik) ──────────────
    function applyBreederChange(member, triggerSync = false) {
        ACTIVE_BREEDER = member;
        const coords = getActiveBreederCoords();
        HOME_LAT = coords.lat;
        HOME_LON = coords.lon;

        if (breederName) breederName.textContent = member.name;
        const headerBreederName = document.getElementById('header-breeder-name');
        if (headerBreederName) {
            let firstName = member.name;
            if (firstName.includes(',')) {
                firstName = firstName.split(',')[1].trim();
            }
            headerBreederName.textContent = firstName;
        }
        if (breederPersNr) breederPersNr.textContent = member.persNr;
        if (breederCoords) {
            const hasCoords = coords.lat !== 51.556083 || coords.lon !== 7.215639;
            breederCoords.textContent = hasCoords
                ? `${coords.lat.toFixed(4)}° N  ${coords.lon.toFixed(4)}° E`
                : '(keine Koordinaten)';
        }
        updateLocationWidget(coords.lat, coords.lon);
        updatePigeonExtractorStatus();

        const rvBadge = document.getElementById('breeder-rv-badge');
        if (rvBadge) {
            if (ACTIVE_RV && ACTIVE_RV.origrvnr) {
                rvBadge.textContent = `RV ${ACTIVE_RV.origrvnr.replace(/^(\d{3})(\d{2})$/, '$1/$2')}`;
            } else if (currentRvId) {
                rvBadge.textContent = `RV ${currentRvId.replace(/^(\d{3})(\d{2,3})$/, '$1/$2')}`;
            }
        }

        console.log(`[Züchter] Gewechselt zu: ${member.name} (${member.persNr}) → ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);

        if (triggerSync) {
            console.log('[Auto-Sync] Züchter-Wechsel → autoSync()');
            autoSync();
        }
    }

    // ── LOCATION WIDGET ───────────────────────────────────────────
    let locationFetchController = null;
    async function updateLocationWidget(lat, lon) {
        if (!locationLink || !locationCity) return;
        locationLink.href = 'javascript:void(0)';
        locationLink.onclick = (e) => { e.preventDefault(); openMaps(lat, lon, 'Schlag-Standort'); };
        if (breederCoords) {
            breederCoords.textContent = `${lat.toFixed(4)}° N  ${lon.toFixed(4)}° E`;
        }
        if (lat === 51.556083 && lon === 7.215639 && ACTIVE_BREEDER.latRiro === '000000,0') {
            locationCity.textContent = '📍 (Standort wird ermittelt…)';
        }
        locationCity.textContent = '…';
        if (locationFetchController) locationFetchController.abort();
        locationFetchController = new AbortController();
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&addressdetails=1`,
                { signal: locationFetchController.signal, headers: { 'Accept-Language': 'de' } }
            );
            const data = await resp.json();
            const city = data.address?.city || data.address?.town || data.address?.village
                || data.address?.suburb || data.address?.county || 'Unbekannt';
            locationCity.textContent = city;
        } catch (e) {
            if (e.name !== 'AbortError') locationCity.textContent = 'Fehler';
        }
    }

    // ── PIGEON EXTRACTOR STATUS ───────────────────────────────────
    function updatePigeonExtractorStatus() {
        if (!extractorDiv || !extractorCnt) return;
        const allRings = new Set();
        appData.flights.forEach(f => {
            if (f.plMeta && f.plMeta.allRings) {
                f.plMeta.allRings.forEach(r => allRings.add(r));
            }
            (f.pigeons || []).forEach(p => { if (p.ringNumber) allRings.add(p.ringNumber); });
        });
        if (allRings.size > 0) {
            extractorCnt.textContent = allRings.size;
            extractorDiv.style.display = 'block';
            extractorDiv.title = [...allRings].join(', ');
        } else {
            extractorDiv.style.display = 'none';
        }
    }

    // ── Initialisierung ───────────────────────────────────────────
    const activeRegV = getActiveRegV();
    currentRegvParam = activeRegV.regvRiRoParam;
    currentRvId = ACTIVE_RV.rvId;
    if (regvSelect) populateRvDropdown(activeRegV.regvRiRoParam);
    else { populateVereinDropdown(ACTIVE_RV.rvId); }
    applyBreederChange(ACTIVE_BREEDER, false);
    updatePigeonExtractorStatus();

    document.addEventListener('riroSyncComplete', updatePigeonExtractorStatus);
})();


// =============================================================
// KONVERTER-TEST (interne Validierung beim Start – nur Console)
// Referenz: 513321,9 → 51 + 33/60 + 21.9/3600 = 51.5561 ✅
// =============================================================
(function selfTest() {
    const testCases = [
        { input: '513321,9', expected: 51.5561, label: 'Breite HolperHeidLückenbach' },
        { input: '071256,3', expected: 7.2156, label: 'Länge HolperHeidLückenbach' },
        { input: '500118,8', expected: 50.0219, label: 'Breite Aschaffenburg Auflassort' },
        { input: '090220,2', expected: 9.0389, label: 'Länge Aschaffenburg Auflassort' },
    ];
    let passed = 0;
    testCases.forEach(tc => {
        const result = convertRiRoCoords(tc.input);
        const ok = result !== null && Math.abs(result - tc.expected) < 0.0005;
        if (ok) passed++;
        console.log(`[Konverter-Test] ${tc.label}: ${tc.input} → ${result?.toFixed(4)} (erwartet ~${tc.expected}) ${ok ? '✅' : '❌'}`);
    });
    console.log(`[Konverter-Test] Ergebnis: ${passed}/${testCases.length} bestanden`);
})();