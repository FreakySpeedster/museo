/** Generates offline-friendly SVG artwork (4:5) used as thumbnails for the seed data. */
export type Motif = "book" | "vinyl" | "mountain" | "plant" | "bauhaus" | "film" | "gadget" | "code" | "bowl" | "sneaker" | "polaroid" | "pixel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(label: string, max = 16): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function caption(label: string, y = 880, color = "#fff") {
  const lines = wrap(label);
  return lines
    .map((l, i) => `<text x="400" y="${y + i * 48 - (lines.length - 1) * 24}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="44" fill="${color}" letter-spacing="-1">${esc(l)}</text>`)
    .join("");
}

export function renderArt(motif: Motif, [a, b, c]: [string, string, string], label: string): string {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/>`;
  const tail = `</svg>`;
  let body = "";
  switch (motif) {
    case "book":
      body = `<rect x="150" y="130" width="500" height="700" rx="14" fill="${c}"/><rect x="150" y="130" width="46" height="700" rx="14" fill="#000" opacity=".25"/><rect x="230" y="210" width="360" height="12" fill="#fff" opacity=".8"/><rect x="230" y="240" width="220" height="12" fill="#fff" opacity=".5"/><circle cx="410" cy="520" r="120" fill="${a}" opacity=".9"/><circle cx="470" cy="470" r="70" fill="${b}" opacity=".9"/><rect x="230" y="720" width="360" height="8" fill="#fff" opacity=".6"/>${caption(label, 930)}`;
      break;
    case "vinyl":
      body = `<circle cx="400" cy="440" r="320" fill="#111"/>${[290, 250, 210, 170].map((r) => `<circle cx="400" cy="440" r="${r}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`).join("")}<circle cx="400" cy="440" r="110" fill="${c}"/><circle cx="400" cy="440" r="14" fill="#111"/><path d="M400 120a320 320 0 0 1 230 100" stroke="#fff" stroke-opacity=".25" stroke-width="10" fill="none" stroke-linecap="round"/>${caption(label, 880)}`;
      break;
    case "mountain":
      body = `<circle cx="560" cy="300" r="90" fill="${c}"/><path d="M0 700 L200 420 L340 600 L520 360 L800 720 V1000 H0Z" fill="#000" opacity=".28"/><path d="M0 800 L180 580 L330 720 L520 500 L800 820 V1000 H0Z" fill="#000" opacity=".4"/><path d="M0 900 L220 740 L420 860 L620 700 L800 880 V1000 H0Z" fill="#000" opacity=".55"/>${caption(label, 940)}`;
      break;
    case "plant":
      body = `<g fill="${c}">${[[-60, -30], [60, -40], [0, -120], [-120, 40], [120, 30]].map(([x, r], i) => `<ellipse cx="${400 + x * 2}" cy="${430 - Math.abs(x) * 0.4}" rx="70" ry="190" transform="rotate(${x * 0.8 + r * 0.2} ${400 + x * 2} 560)" opacity="${0.75 + (i % 2) * 0.2}"/>`).join("")}</g><path d="M300 640h200l-30 220H330z" fill="#000" opacity=".4"/><rect x="290" y="620" width="220" height="34" rx="10" fill="#000" opacity=".55"/>${caption(label, 930)}`;
      break;
    case "bauhaus":
      body = `<circle cx="280" cy="330" r="180" fill="${c}"/><rect x="380" y="300" width="300" height="300" fill="#000" opacity=".28"/><path d="M180 760 L400 420 L620 760Z" fill="#fff" opacity=".85"/><circle cx="600" cy="250" r="50" fill="#fff"/>${caption(label, 900)}`;
      break;
    case "film":
      body = `<rect x="120" y="180" width="560" height="560" rx="28" fill="#000" opacity=".85"/>${Array.from({ length: 8 }, (_, i) => `<rect x="138" y="${210 + i * 66}" width="26" height="38" rx="6" fill="#fff" opacity=".8"/><rect x="636" y="${210 + i * 66}" width="26" height="38" rx="6" fill="#fff" opacity=".8"/>`).join("")}<rect x="190" y="230" width="420" height="460" rx="14" fill="url(#g)"/><path d="M350 360 L350 560 L520 460Z" fill="#fff"/>${caption(label, 880)}`;
      break;
    case "gadget":
      body = `<rect x="200" y="120" width="400" height="660" rx="60" fill="#0b0b0f"/><rect x="224" y="144" width="352" height="612" rx="40" fill="url(#s)"/><rect x="224" y="144" width="352" height="612" rx="40" fill="${c}" opacity=".75"/><circle cx="400" cy="400" r="90" fill="#fff" opacity=".85"/><rect x="300" y="580" width="200" height="14" rx="7" fill="#fff" opacity=".7"/><rect x="330" y="620" width="140" height="14" rx="7" fill="#fff" opacity=".4"/>${caption(label, 890)}`;
      break;
    case "code":
      body = `<rect x="100" y="170" width="600" height="560" rx="26" fill="#0d1117"/><circle cx="150" cy="220" r="12" fill="#ff5f56"/><circle cx="190" cy="220" r="12" fill="#ffbd2e"/><circle cx="230" cy="220" r="12" fill="#27c93f"/>${[[150, 300, 280, a], [190, 350, 360, "#8b949e"], [190, 400, 220, c], [190, 450, 320, "#8b949e"], [150, 500, 180, b], [190, 550, 400, "#8b949e"], [190, 600, 260, c]].map(([x, y, w, col]) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="${col}"/>`).join("")}${caption(label, 880)}`;
      break;
    case "bowl":
      body = `<circle cx="400" cy="400" r="270" fill="#fff" opacity=".92"/><circle cx="400" cy="400" r="230" fill="${c}" opacity=".9"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${230 + i * 20} 330 q ${70 + i * 5} 90 ${300 - i * 30} 0" stroke="#fff" stroke-opacity=".7" stroke-width="12" fill="none" stroke-linecap="round" transform="translate(0 ${i * 38})"/>`).join("")}<circle cx="520" cy="320" r="34" fill="${a}"/><circle cx="300" cy="500" r="28" fill="${b}"/>${caption(label, 870)}`;
      break;
    case "sneaker":
      body = `<path d="M130 640 C140 500 220 430 300 450 C360 465 400 420 470 440 C560 465 640 560 680 600 C700 620 690 660 650 660 H150 C135 660 128 655 130 640Z" fill="${c}"/><path d="M130 650 H690 V700 C690 715 680 722 665 722 H150 C135 722 128 712 130 700Z" fill="#fff"/><path d="M300 450 C330 520 400 540 470 520" stroke="#fff" stroke-opacity=".7" stroke-width="14" fill="none" stroke-linecap="round"/>${[0, 1, 2].map((i) => `<rect x="${340 + i * 40}" y="${450 + i * 6}" width="22" height="46" rx="6" fill="#fff" opacity=".75" transform="rotate(-18 ${350 + i * 40} 470)"/>`).join("")}${caption(label, 880)}`;
      break;
    case "polaroid":
      body = `<g transform="rotate(-5 400 500)"><rect x="130" y="140" width="540" height="680" rx="12" fill="#fffdf8"/><rect x="160" y="170" width="480" height="480" fill="url(#g)"/><circle cx="520" cy="300" r="60" fill="${c}"/><path d="M160 650 L300 470 L400 580 L510 430 L640 650Z" fill="#000" opacity=".35"/></g><text x="400" y="840" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="40" fill="#fff">${esc(label)}</text>`;
      break;
    case "pixel":
      body = Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => ((x * 7 + y * 13 + x * y) % 5 < 2 ? `<rect x="${130 + x * 70}" y="${140 + y * 70}" width="64" height="64" rx="8" fill="${(x + y) % 2 ? c : "#fff"}" opacity="${0.55 + ((x * y) % 4) * 0.12}"/>` : "")).join("")).join("") + caption(label, 880);
      break;
  }
  return head + body + tail;
}
