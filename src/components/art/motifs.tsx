import type { ReactNode } from "react";
import type { ArtPalette, Motif } from "@/lib/fallback-art";

/**
 * Flat, bold illustrations on a 200x200 canvas, centred with a soft ground shadow. Each draws only with the
 * palette (fg, deep, accent) plus white, so any motif works with any palette.
 */
const W = "#fff";
const shadow = (rx = 56, cy = 170) => <ellipse cx="100" cy={cy} rx={rx} ry="7" fill="#000" opacity=".12" />;

export const MOTIF_ART: Record<Motif, (p: ArtPalette) => ReactNode> = {
  bottle: ({ fg, deep, accent }) => (
    <>
      {shadow(46)}
      <rect x="86" y="34" width="28" height="24" rx="5" fill={accent} />
      <rect x="93" y="56" width="14" height="12" fill={deep} />
      <rect x="58" y="66" width="84" height="100" rx="20" fill={fg} />
      <rect x="68" y="78" width="10" height="70" rx="5" fill={W} opacity=".3" />
      <rect x="82" y="100" width="44" height="32" rx="5" fill={W} opacity=".92" />
      <rect x="92" y="112" width="24" height="4" rx="2" fill={fg} />
      <rect x="96" y="120" width="16" height="3" rx="1.5" fill={fg} opacity=".5" />
    </>
  ),
  plant: ({ fg, deep, accent }) => (
    <>
      {shadow(40)}
      <g transform="translate(100 118)">
        {[-62, -30, 0, 30, 62].map((r, i) => (
          <g key={r} transform={`rotate(${r})`}>
            <path d={`M0 0 C-${i % 2 ? 16 : 20} -26 -${i % 2 ? 14 : 18} -60 0 -${i === 2 ? 84 : 70} C${i % 2 ? 14 : 18} -60 ${i % 2 ? 16 : 20} -26 0 0Z`} fill={i % 2 ? deep : fg} />
            <path d={`M0 -6 V-${i === 2 ? 70 : 58}`} stroke={W} strokeOpacity=".28" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <rect x="64" y="114" width="72" height="14" rx="4" fill={accent} />
      <path d="M70 128 H130 L122 168 H78Z" fill={accent} />
      <path d="M70 128 H130 L128 138 H72Z" fill="#000" opacity=".12" />
      <path d="M75 148 H125" stroke={W} strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  flower: ({ fg, deep, accent }) => (
    <>
      {shadow(34)}
      <path d="M100 92 V140" stroke={deep} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 124 C86 120 76 108 78 100 C90 100 100 112 100 124Z" fill={deep} />
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <ellipse key={r} cx="100" cy="64" rx="13" ry="22" transform={`rotate(${r} 100 84)`} fill={W} opacity=".95" />
      ))}
      <circle cx="100" cy="84" r="13" fill={accent} />
      <path d="M76 136 H124 L118 168 H82Z" fill={fg} />
      <rect x="72" y="132" width="56" height="10" rx="4" fill={deep} />
    </>
  ),
  book: ({ fg, deep, accent }) => (
    <>
      {shadow(60)}
      <rect x="44" y="140" width="112" height="26" rx="4" fill={fg} />
      <rect x="44" y="140" width="10" height="26" rx="3" fill={deep} />
      <rect x="64" y="151" width="70" height="4" rx="2" fill={W} opacity=".5" />
      <rect x="54" y="114" width="98" height="26" rx="4" fill={accent} />
      <rect x="140" y="114" width="12" height="26" rx="3" fill="#000" opacity=".12" />
      <rect x="66" y="125" width="54" height="4" rx="2" fill={deep} opacity=".5" />
      <g transform="rotate(-8 100 90)">
        <rect x="58" y="62" width="34" height="54" rx="3" fill={W} />
        <rect x="96" y="62" width="34" height="54" rx="3" fill={W} />
        <path d="M94 62 V116" stroke={deep} strokeWidth="3" />
        {[72, 80, 88, 96].map((y) => (
          <g key={y} opacity=".35">
            <rect x="64" y={y} width="22" height="3" rx="1.5" fill={deep} />
            <rect x="102" y={y} width="22" height="3" rx="1.5" fill={deep} />
          </g>
        ))}
      </g>
    </>
  ),
  sneaker: ({ fg, deep, accent }) => (
    <>
      {shadow(64, 168)}
      <path d="M38 140 C38 116 52 98 74 98 C88 98 92 110 108 112 C132 115 152 124 162 140 C166 147 163 152 156 152 H44 C40 152 38 147 38 140Z" fill={fg} />
      <path d="M56 98 C60 88 70 86 76 90 L72 104 Z" fill={deep} />
      <path d="M66 134 C88 124 116 122 146 136" stroke={accent} strokeWidth="7" fill="none" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${84 + i * 9} ${104 + i * 2} l7 -8`} stroke={W} strokeWidth="3.5" strokeLinecap="round" />
      ))}
      <path d="M36 150 H164 C166 152 166 156 164 160 C162 164 158 166 152 166 H46 C40 166 36 162 36 157Z" fill={W} />
      <path d="M40 160 H162" stroke={deep} strokeOpacity=".25" strokeWidth="2" />
    </>
  ),
  shirt: ({ fg, deep, accent }) => (
    <>
      {shadow(44)}
      <path d="M100 30 a7 7 0 1 1 7 7 c-3 0 -7 2 -7 6 V48" stroke={W} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M100 48 L56 60" stroke={W} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M100 48 L144 60" stroke={W} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M72 56 L48 66 L34 94 L56 104 L64 92 V164 H136 V92 L144 104 L166 94 L152 66 L128 56 C124 68 113 74 100 74 C87 74 76 68 72 56Z" fill={fg} />
      <path d="M72 56 C76 68 87 74 100 74 C113 74 124 68 128 56" stroke={deep} strokeWidth="5" fill="none" />
      <rect x="110" y="98" width="16" height="16" rx="3" fill={accent} />
      <path d="M64 92 V164 H136 V92" stroke="#000" strokeOpacity=".08" strokeWidth="6" fill="none" />
    </>
  ),
  watch: ({ fg, deep, accent }) => (
    <>
      <rect x="80" y="26" width="40" height="148" rx="12" fill={deep} />
      {[40, 52, 144, 156].map((y) => <rect key={y} x="84" y={y} width="32" height="3" rx="1.5" fill={W} opacity=".18" />)}
      <rect x="140" y="92" width="10" height="16" rx="3" fill={accent} />
      <circle cx="100" cy="100" r="44" fill={accent} />
      <circle cx="100" cy="100" r="36" fill={W} />
      {[0, 90, 180, 270].map((r) => <rect key={r} x="98" y="68" width="4" height="9" rx="2" fill={fg} transform={`rotate(${r} 100 100)`} />)}
      <path d="M100 100 V76" stroke={fg} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 100 L118 110" stroke={deep} strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill={fg} />
    </>
  ),
  ring: ({ fg, deep, accent }) => (
    <>
      {shadow(44)}
      <circle cx="100" cy="124" r="40" stroke={accent} strokeWidth="12" fill="none" />
      <path d="M68 108 A40 40 0 0 1 132 108" stroke={W} strokeOpacity=".45" strokeWidth="3" fill="none" />
      <path d="M74 72 L86 52 H114 L126 72 L100 100Z" fill={W} />
      <path d="M74 72 H126 L100 100Z" fill={fg} opacity=".55" />
      <path d="M86 52 L94 72 L100 52 L106 72 L114 52" stroke={fg} strokeOpacity=".5" strokeWidth="2" fill="none" />
      <path d="M94 72 L100 100 L106 72" stroke={deep} strokeOpacity=".4" strokeWidth="2" fill="none" />
    </>
  ),
  bag: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <path d="M74 82 V68 a26 26 0 0 1 52 0 V82" stroke={deep} strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="46" y="78" width="108" height="88" rx="16" fill={fg} />
      <path d="M46 94 C46 84 54 78 62 78 H138 C146 78 154 84 154 94 V108 C130 122 70 122 46 108Z" fill={deep} />
      <rect x="90" y="108" width="20" height="16" rx="4" fill={accent} />
      <rect x="58" y="128" width="6" height="28" rx="3" fill={W} opacity=".2" />
    </>
  ),
  glasses: ({ fg, deep, accent }) => (
    <>
      {shadow(60, 150)}
      <path d="M38 96 L22 78 M162 96 L178 78" stroke={deep} strokeWidth="6" strokeLinecap="round" />
      <path d="M86 98 Q100 86 114 98" stroke={deep} strokeWidth="6" fill="none" strokeLinecap="round" />
      {[64, 136].map((cx) => (
        <g key={cx}>
          <rect x={cx - 28} y="80" width="56" height="44" rx="18" fill={accent} opacity=".75" stroke={fg} strokeWidth="8" />
          <path d={`M${cx - 14} 92 l12 -4`} stroke={W} strokeOpacity=".8" strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}
    </>
  ),
  vinyl: ({ fg, accent }) => (
    <>
      {shadow(62)}
      <rect x="30" y="48" width="104" height="112" rx="6" fill={fg} />
      <rect x="44" y="62" width="40" height="6" rx="3" fill={W} opacity=".5" />
      <circle cx="122" cy="104" r="54" fill="#141414" />
      {[46, 38, 30].map((r) => <circle key={r} cx="122" cy="104" r={r} fill="none" stroke={W} strokeOpacity=".1" strokeWidth="2" />)}
      <path d="M92 66 A50 50 0 0 1 152 68" stroke={W} strokeOpacity=".22" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="122" cy="104" r="19" fill={accent} />
      <circle cx="122" cy="104" r="3.5" fill="#141414" />
    </>
  ),
  headphones: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <path d="M50 118 V100 a50 50 0 0 1 100 0 V118" stroke={deep} strokeWidth="11" fill="none" strokeLinecap="round" />
      {[38, 134].map((x) => (
        <g key={x}>
          <rect x={x} y="100" width="28" height="58" rx="12" fill={fg} />
          <rect x={x === 38 ? x + 18 : x - 4} y="108" width="14" height="42" rx="6" fill={accent} />
        </g>
      ))}
    </>
  ),
  film: ({ fg, deep, accent }) => (
    <>
      {shadow(58)}
      <rect x="44" y="84" width="112" height="80" rx="8" fill={fg} />
      <g transform="rotate(-14 46 82)">
        <rect x="44" y="62" width="112" height="20" rx="4" fill={W} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${56 + i * 26} 62 l14 20 h-12 l-14 -20z`} fill={deep} />)}
      </g>
      <rect x="44" y="84" width="112" height="14" fill={deep} />
      <circle cx="100" cy="130" r="20" fill={accent} />
      <path d="M94 120 L112 130 L94 140Z" fill={deep} />
    </>
  ),
  gamepad: ({ fg, deep, accent }) => (
    <>
      {shadow(66)}
      <path d="M62 76 H138 C160 76 172 98 174 122 C176 144 164 156 150 152 C140 149 134 134 124 130 H76 C66 134 60 149 50 152 C36 156 24 144 26 122 C28 98 40 76 62 76Z" fill={fg} />
      <path d="M58 98 V122 M46 110 H70" stroke={W} strokeWidth="8" strokeLinecap="round" />
      <circle cx="134" cy="98" r="7" fill={accent} />
      <circle cx="148" cy="112" r="7" fill={W} />
      <circle cx="120" cy="112" r="7" fill={W} />
      <circle cx="134" cy="126" r="7" fill={accent} />
      <rect x="88" y="94" width="24" height="6" rx="3" fill={deep} />
    </>
  ),
  dice: ({ fg, accent }) => (
    <>
      {shadow(62)}
      <g transform="rotate(-12 76 120)">
        <rect x="40" y="84" width="72" height="72" rx="14" fill={W} />
        {[[58, 102], [94, 102], [76, 120], [58, 138], [94, 138]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill={fg} />)}
      </g>
      <g transform="rotate(14 132 104)">
        <rect x="100" y="68" width="64" height="64" rx="12" fill={accent} />
        {[[116, 84], [132, 100], [148, 116]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5.5" fill={fg} />)}
      </g>
    </>
  ),
  cards: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      {[
        [-16, W, fg],
        [0, fg, W],
        [16, accent, deep],
      ].map(([r, bg, ink]) => (
        <g key={r as number} transform={`rotate(${r} 100 170)`}>
          <rect x="70" y="52" width="60" height="88" rx="7" fill={bg as string} stroke="#000" strokeOpacity=".08" strokeWidth="2" />
          <rect x="78" y="60" width="44" height="40" rx="4" fill={ink as string} opacity=".25" />
          <path d="M100 108 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill={ink as string} opacity=".8" />
        </g>
      ))}
    </>
  ),
  robot: ({ fg, deep, accent }) => (
    <>
      {shadow(44)}
      <path d="M100 40 V54" stroke={deep} strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="38" r="6" fill={accent} />
      <rect x="66" y="54" width="68" height="50" rx="14" fill={fg} />
      <rect x="76" y="66" width="48" height="24" rx="10" fill={W} />
      <circle cx="90" cy="78" r="5" fill={deep} />
      <circle cx="110" cy="78" r="5" fill={deep} />
      <rect x="72" y="108" width="56" height="44" rx="10" fill={deep} />
      <rect x="88" y="118" width="24" height="12" rx="4" fill={accent} />
      <rect x="52" y="112" width="14" height="34" rx="7" fill={fg} />
      <rect x="134" y="112" width="14" height="34" rx="7" fill={fg} />
      <rect x="80" y="152" width="14" height="16" rx="4" fill={fg} />
      <rect x="106" y="152" width="14" height="16" rx="4" fill={fg} />
    </>
  ),
  blocks: ({ fg, deep, accent }) => (
    <>
      {shadow(62)}
      <rect x="40" y="116" width="120" height="50" rx="5" fill={fg} />
      {[48, 76, 104, 132].map((x) => <rect key={x} x={x} y="106" width="20" height="12" rx="3" fill={fg} />)}
      <rect x="40" y="116" width="120" height="8" fill="#000" opacity=".1" />
      <rect x="64" y="70" width="72" height="44" rx="5" fill={accent} />
      {[72, 112].map((x) => <rect key={x} x={x} y="60" width="20" height="12" rx="3" fill={accent} />)}
      <rect x="64" y="70" width="72" height="8" fill="#000" opacity=".08" />
      <rect x="48" y="128" width="6" height="30" rx="3" fill={W} opacity=".25" />
      <rect x="128" y="80" width="6" height="26" rx="3" fill={deep} opacity=".2" />
    </>
  ),
  coin: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <circle cx="126" cy="96" r="38" fill={W} opacity=".7" />
      <circle cx="90" cy="112" r="50" fill={accent} />
      <circle cx="90" cy="112" r="40" fill="none" stroke={deep} strokeOpacity=".3" strokeWidth="3" />
      <path d="M90 88 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill={fg} />
    </>
  ),
  camera: ({ fg, deep, accent }) => (
    <>
      {shadow(62)}
      <rect x="68" y="58" width="40" height="20" rx="5" fill={deep} />
      <rect x="36" y="72" width="128" height="86" rx="16" fill={fg} />
      <rect x="36" y="94" width="128" height="10" fill={deep} opacity=".5" />
      <circle cx="100" cy="116" r="32" fill={W} />
      <circle cx="100" cy="116" r="23" fill={accent} />
      <circle cx="100" cy="116" r="12" fill={deep} />
      <circle cx="94" cy="110" r="4" fill={W} opacity=".7" />
      <rect x="134" y="80" width="18" height="10" rx="3" fill={W} opacity=".7" />
      <rect x="46" y="64" width="16" height="10" rx="3" fill={accent} />
    </>
  ),
  palette: ({ fg, deep, accent }) => (
    <>
      {shadow(60)}
      <path d="M100 52 C142 52 168 78 166 108 C164 132 146 132 134 128 C122 124 114 132 118 144 C122 156 112 166 96 164 C60 160 34 136 36 108 C38 76 64 52 100 52Z" fill={W} />
      <circle cx="74" cy="90" r="10" fill={fg} />
      <circle cx="102" cy="76" r="10" fill={accent} />
      <circle cx="132" cy="88" r="10" fill={deep} />
      <circle cx="64" cy="122" r="10" fill={accent} opacity=".6" />
      <path d="M150 40 L106 120" stroke={deep} strokeWidth="7" strokeLinecap="round" />
      <path d="M108 116 L100 132 L114 124Z" fill={fg} />
    </>
  ),
  frame: ({ fg, deep, accent }) => (
    <>
      {shadow(52)}
      <rect x="48" y="40" width="104" height="124" rx="4" fill={W} />
      <rect x="58" y="50" width="84" height="104" fill={fg} />
      <circle cx="118" cy="80" r="14" fill={accent} />
      <path d="M58 154 V128 L84 100 L104 122 L118 110 L142 134 V154Z" fill={deep} />
    </>
  ),
  pencil: ({ fg, deep, accent }) => (
    <>
      {shadow(58)}
      <rect x="52" y="48" width="84" height="112" rx="6" fill={W} />
      {[72, 88, 104, 120, 136].map((y) => <rect key={y} x="64" y={y} width="60" height="3" rx="1.5" fill={deep} opacity=".18" />)}
      <rect x="52" y="48" width="10" height="112" fill={fg} opacity=".25" />
      <g transform="rotate(38 120 104)">
        <rect x="110" y="40" width="20" height="96" rx="2" fill={accent} />
        <rect x="110" y="40" width="20" height="14" rx="2" fill={fg} />
        <path d="M110 136 H130 L120 156Z" fill="#f6dcb5" />
        <path d="M116 148 H124 L120 156Z" fill={deep} />
      </g>
    </>
  ),
  phone: ({ fg, deep, accent }) => (
    <>
      {shadow(40)}
      <rect x="66" y="32" width="68" height="134" rx="14" fill={deep} />
      <rect x="72" y="40" width="56" height="118" rx="9" fill={W} />
      <rect x="90" y="44" width="20" height="5" rx="2.5" fill={deep} />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={79 + c * 15} y={60 + r * 17} width="11" height="11" rx="3" fill={(r + c) % 2 ? accent : fg} opacity={(r + c) % 3 ? 1 : 0.6} />))}
      <rect x="79" y="128" width="42" height="18" rx="5" fill={fg} opacity=".18" />
    </>
  ),
  laptop: ({ fg, deep, accent }) => (
    <>
      {shadow(70)}
      <rect x="46" y="54" width="108" height="76" rx="8" fill={deep} />
      <rect x="53" y="61" width="94" height="62" rx="4" fill={W} />
      {[
        [62, 72, 30, fg], [68, 82, 44, accent], [68, 92, 26, fg], [62, 102, 38, accent], [62, 112, 20, fg],
      ].map(([x, y, w, c]) => <rect key={`${y}`} x={x as number} y={y as number} width={w as number} height="5" rx="2.5" fill={c as string} opacity=".8" />)}
      <path d="M28 134 H172 L164 150 H36Z" fill={fg} />
      <rect x="86" y="134" width="28" height="5" rx="2" fill={deep} />
    </>
  ),
  keyboard: ({ fg, deep, accent }) => (
    <>
      {shadow(70)}
      <rect x="28" y="80" width="144" height="70" rx="10" fill={fg} />
      {[0, 1, 2].map((r) => Array.from({ length: 8 }, (_, c) => (
        <rect key={`${r}${c}`} x={38 + c * 16} y={89 + r * 16} width="12" height="12" rx="3" fill={r === 0 && c === 7 ? accent : W} opacity={r === 0 && c === 7 ? 1 : 0.9} />
      )))}
      <rect x="62" y="137" width="76" height="8" rx="3" fill={W} opacity=".9" />
      <rect x="150" y="137" width="12" height="8" rx="3" fill={accent} />
      <path d="M100 80 C100 64 120 66 124 52" stroke={deep} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  guitar: ({ fg, deep, accent }) => (
    <>
      {shadow(48)}
      <g transform="rotate(30 100 104)">
        <rect x="94" y="22" width="12" height="80" rx="3" fill={deep} />
        <rect x="90" y="14" width="20" height="18" rx="4" fill={deep} />
        <circle cx="100" cy="104" r="24" fill={accent} />
        <circle cx="100" cy="138" r="32" fill={accent} />
        <rect x="80" y="104" width="40" height="30" fill={accent} />
        <circle cx="100" cy="118" r="10" fill={fg} />
        <rect x="88" y="146" width="24" height="6" rx="2" fill={fg} />
        <path d="M97 30 V148 M103 30 V148" stroke={W} strokeOpacity=".6" strokeWidth="1" />
      </g>
    </>
  ),
  sofa: ({ fg, deep, accent }) => (
    <>
      {shadow(70)}
      <rect x="44" y="72" width="112" height="52" rx="14" fill={fg} />
      <rect x="30" y="100" width="28" height="52" rx="12" fill={deep} />
      <rect x="142" y="100" width="28" height="52" rx="12" fill={deep} />
      <rect x="50" y="116" width="100" height="32" rx="8" fill={fg} />
      <rect x="50" y="116" width="100" height="8" rx="4" fill={W} opacity=".15" />
      <rect x="62" y="88" width="30" height="26" rx="8" fill={accent} transform="rotate(-8 77 101)" />
      <path d="M44 152 V166 M156 152 V166" stroke={deep} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  bowl: ({ fg, deep, accent }) => (
    <>
      {shadow(62)}
      <path d="M140 40 L88 104 M156 48 L96 108" stroke={deep} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="106" rx="64" ry="14" fill={fg} />
      <circle cx="78" cy="100" r="12" fill={accent} />
      <circle cx="104" cy="98" r="10" fill={W} />
      <circle cx="104" cy="98" r="5" fill={accent} />
      <path d="M118 104 q10 -16 24 -4" fill={deep} />
      <path d="M36 106 H164 C164 142 136 164 100 164 C64 164 36 142 36 106Z" fill={W} />
      <path d="M48 124 H152" stroke={accent} strokeWidth="5" />
    </>
  ),
  cup: ({ fg, deep, accent }) => (
    <>
      <ellipse cx="96" cy="160" rx="60" ry="10" fill={deep} />
      <path d="M128 98 h10 a18 18 0 0 1 0 36 h-10" stroke={W} strokeWidth="9" fill="none" />
      <path d="M58 84 H134 V134 C134 148 124 158 110 158 H82 C68 158 58 148 58 134Z" fill={W} />
      <ellipse cx="96" cy="84" rx="38" ry="8" fill={fg} />
      <rect x="58" y="110" width="76" height="8" fill={accent} />
      {[80, 96, 112].map((x) => <path key={x} d={`M${x} 70 c-8 -10 8 -16 0 -28`} stroke={W} strokeOpacity=".75" strokeWidth="4" fill="none" strokeLinecap="round" />)}
    </>
  ),
  wine: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <rect x="44" y="70" width="32" height="96" rx="10" fill={deep} />
      <rect x="52" y="40" width="16" height="36" rx="4" fill={deep} />
      <rect x="51" y="40" width="18" height="10" rx="3" fill={accent} />
      <rect x="48" y="104" width="24" height="28" rx="3" fill={W} opacity=".92" />
      <path d="M100 56 H150 C152 86 142 108 125 108 C108 108 98 86 100 56Z" fill={W} opacity=".9" />
      <path d="M102 78 H148 C146 96 138 108 125 108 C112 108 104 96 102 78Z" fill={fg} />
      <path d="M125 108 V154" stroke={W} strokeWidth="4" />
      <ellipse cx="125" cy="158" rx="18" ry="5" fill={W} />
    </>
  ),
  beer: ({ fg, deep, accent }) => (
    <>
      {shadow(50)}
      <path d="M134 82 h10 a16 16 0 0 1 16 16 v20 a16 16 0 0 1 -16 16 h-10" stroke={W} strokeWidth="9" fill="none" />
      <rect x="58" y="70" width="80" height="96" rx="10" fill={accent} />
      <rect x="58" y="70" width="80" height="96" rx="10" fill={fg} opacity=".25" />
      {[76, 98, 120].map((x) => <rect key={x} x={x - 3} y="92" width="6" height="62" rx="3" fill={W} opacity=".35" />)}
      {[[66, 66, 14], [86, 60, 16], [108, 62, 15], [128, 68, 12]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={W} />)}
      <rect x="58" y="66" width="80" height="12" fill={W} />
      <circle cx="120" cy="140" r="4" fill={deep} opacity=".3" />
    </>
  ),
  cake: ({ fg, deep, accent }) => (
    <>
      <ellipse cx="100" cy="162" rx="66" ry="10" fill={W} opacity=".9" />
      <rect x="48" y="104" width="104" height="54" rx="8" fill={fg} />
      <rect x="48" y="126" width="104" height="8" fill={W} opacity=".9" />
      <path d="M48 112 C48 100 56 96 64 96 H136 C144 96 152 100 152 112 C146 118 140 108 134 116 C126 124 120 108 112 116 C104 124 98 108 90 116 C82 124 76 108 68 116 C60 124 54 114 48 116Z" fill={W} />
      {[78, 100, 122].map((x) => <rect key={x} x={x - 3} y="70" width="6" height="26" rx="2" fill={accent} />)}
      {[78, 100, 122].map((x) => <path key={x} d={`M${x} 56 c6 6 4 12 0 12 c-4 0 -6 -6 0 -12Z`} fill="#ffb648" />)}
      <rect x="56" y="140" width="6" height="12" rx="3" fill={deep} opacity=".3" />
    </>
  ),
  pizza: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <path d="M40 66 C76 46 124 46 160 66 L100 166Z" fill="#f6c46a" />
      <path d="M40 66 C76 46 124 46 160 66 L154 78 C120 60 80 60 46 78Z" fill={deep} opacity=".55" />
      {[[80, 90], [118, 88], [100, 120], [92, 146]].map(([cx, cy]) => <circle key={cx + cy} cx={cx} cy={cy} r="9" fill={fg} />)}
      {[[100, 84], [116, 112], [84, 116]].map(([cx, cy]) => <circle key={cx + cy} cx={cx} cy={cy} r="4.5" fill={accent} />)}
    </>
  ),
  trophy: ({ fg, deep, accent }) => (
    <>
      {shadow(46)}
      <path d="M66 54 H44 C44 82 58 96 74 96 M134 54 H156 C156 82 142 96 126 96" stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M64 42 H136 V70 C136 96 120 112 100 112 C80 112 64 96 64 70Z" fill={accent} />
      <path d="M100 58 l5 10 11 1.5 -8 7.5 2 11 -10 -5 -10 5 2 -11 -8 -7.5 11 -1.5z" fill={W} />
      <rect x="92" y="110" width="16" height="22" fill={accent} />
      <rect x="70" y="132" width="60" height="32" rx="5" fill={fg} />
      <rect x="84" y="142" width="32" height="10" rx="2" fill={deep} />
    </>
  ),
  dumbbell: ({ fg, deep, accent }) => (
    <>
      {shadow(70)}
      <rect x="54" y="104" width="92" height="12" rx="6" fill={W} />
      {[[36, 40], [54, 56], [134, 56], [152, 40]].map(([x, h], i) => <rect key={x} x={x - 6} y={110 - h / 2} width="18" height={h} rx="5" fill={i === 1 || i === 2 ? fg : deep} />)}
      <rect x="86" y="104" width="28" height="12" rx="4" fill={accent} />
    </>
  ),
  bike: ({ fg, deep, accent }) => (
    <>
      {shadow(70, 160)}
      {[58, 142].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="124" r="30" stroke={deep} strokeWidth="7" fill="none" />
          <circle cx={cx} cy="124" r="5" fill={deep} />
        </g>
      ))}
      <path d="M58 124 L84 84 H130 L142 124 M84 84 L100 124 L130 84 M100 124 H58" stroke={fg} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M84 84 L80 72 M70 70 H92" stroke={deep} strokeWidth="6" strokeLinecap="round" />
      <path d="M130 84 L126 66 H140" stroke={deep} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="124" r="8" fill={accent} />
    </>
  ),
  mountain: ({ fg, deep, accent }) => (
    <>
      <circle cx="136" cy="62" r="20" fill={accent} />
      <path d="M20 168 L76 76 L118 136 L140 108 L180 168Z" fill={fg} />
      <path d="M76 76 L62 99 L72 94 L80 102 L90 96Z" fill={W} />
      <path d="M140 108 L132 118 L140 116 L148 120Z" fill={W} />
      <path d="M76 76 L118 136 L110 168 H180 L140 108 L118 136" fill={deep} opacity=".55" />
      <path d="M20 168 H180" stroke={deep} strokeWidth="4" />
    </>
  ),
  tent: ({ fg, deep, accent }) => (
    <>
      {shadow(70, 164)}
      <path d="M150 44 a16 16 0 1 0 12 26 a13 13 0 1 1 -12 -26Z" fill={accent} />
      <path d="M100 52 L36 162 H164Z" fill={fg} />
      <path d="M100 52 L80 162 H120Z" fill={deep} />
      <path d="M100 98 L88 162 H112Z" fill={accent} opacity=".85" />
      <path d="M100 52 L92 40 M100 52 L108 40" stroke={deep} strokeWidth="4" strokeLinecap="round" />
      {[[166, 120], [178, 136]].map(([x, y]) => <path key={x} d={`M${x} ${y - 30} L${x - 12} ${y + 26} H${x + 12}Z`} fill={deep} opacity=".6" />)}
    </>
  ),
  pagoda: ({ fg, deep, accent }) => (
    <>
      <circle cx="132" cy="64" r="28" fill={accent} />
      {shadow(60, 168)}
      <rect x="98" y="30" width="4" height="22" rx="2" fill={deep} />
      <path d="M70 60 Q100 46 130 60 L122 65 H78Z" fill={deep} />
      <rect x="84" y="65" width="32" height="16" fill={W} />
      <path d="M58 86 Q100 70 142 86 L132 91 H68Z" fill={deep} />
      <rect x="77" y="91" width="46" height="18" fill={W} />
      <path d="M48 114 Q100 96 152 114 L140 119 H60Z" fill={deep} />
      <rect x="70" y="119" width="60" height="22" fill={W} />
      <rect x="94" y="126" width="12" height="15" rx="2" fill={fg} />
      <path d="M40 146 Q100 128 160 146 L148 151 H52Z" fill={deep} />
      <rect x="62" y="151" width="76" height="16" fill={fg} />
    </>
  ),
  pin: ({ fg, deep, accent }) => (
    <>
      <path d="M20 168 C50 140 76 150 100 156 C130 162 150 142 180 150 V168Z" fill={deep} opacity=".35" />
      <ellipse cx="100" cy="158" rx="22" ry="6" fill="#000" opacity=".15" />
      <path d="M100 156 C100 156 54 108 54 78 a46 46 0 0 1 92 0 C146 108 100 156 100 156Z" fill={fg} />
      <circle cx="100" cy="78" r="20" fill={W} />
      <circle cx="100" cy="78" r="9" fill={accent} />
      <path d="M68 62 a34 34 0 0 1 16 -18" stroke={W} strokeOpacity=".35" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  city: ({ fg, deep, accent }) => (
    <>
      <circle cx="140" cy="56" r="18" fill={accent} />
      <rect x="30" y="96" width="34" height="72" fill={fg} />
      <rect x="60" y="60" width="38" height="108" fill={deep} />
      <rect x="76" y="44" width="6" height="18" fill={deep} />
      <rect x="96" y="84" width="36" height="84" fill={fg} />
      <rect x="128" y="110" width="42" height="58" fill={deep} />
      {[0, 1, 2, 3, 4].map((r) => [0, 1].map((c) => <rect key={`a${r}${c}`} x={68 + c * 14} y={72 + r * 18} width="8" height="10" fill={W} opacity={(r + c) % 3 ? 0.5 : 0.9} />))}
      {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`b${r}${c}`} x={103 + c * 14} y={96 + r * 20} width="8" height="10" fill={accent} opacity=".8" />))}
      {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`c${r}${c}`} x={136 + c * 11} y={120 + r * 18} width="6" height="9" fill={W} opacity=".55" />))}
      <path d="M24 168 H176" stroke={deep} strokeWidth="4" />
    </>
  ),
  plane: ({ fg, deep, accent }) => (
    <>
      <path d="M40 132 a16 16 0 0 1 26 -14 a20 20 0 0 1 36 6 a12 12 0 0 1 4 24 H44 a12 12 0 0 1 -4 -16Z" fill={W} opacity=".7" />
      <g transform="rotate(-24 100 92)">
        <path d="M40 92 C40 86 46 84 54 84 H146 C160 84 168 88 168 92 C168 96 160 100 146 100 H54 C46 100 40 98 40 92Z" fill={W} />
        <path d="M92 86 L118 48 H128 L116 86Z M92 98 L118 136 H128 L116 98Z" fill={fg} />
        <path d="M44 88 L36 66 H46 L60 86Z" fill={deep} />
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={128 + i * 8} cy="90" r="2.5" fill={deep} opacity=".5" />)}
        <path d="M150 88 h8" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      </g>
    </>
  ),
  boat: ({ fg, deep, accent }) => (
    <>
      <path d="M100 36 V128" stroke={deep} strokeWidth="4" />
      <path d="M104 40 L150 120 H104Z" fill={W} />
      <path d="M96 52 L56 120 H96Z" fill={accent} />
      <path d="M42 128 H158 L142 154 H58Z" fill={fg} />
      <path d="M26 160 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" stroke={W} strokeOpacity=".7" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M38 172 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0" stroke={deep} strokeOpacity=".4" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  fish: ({ fg, deep, accent }) => (
    <>
      {shadow(56)}
      <path d="M40 104 C62 70 118 66 150 104 C118 142 62 138 40 104Z" fill={fg} />
      <path d="M146 104 L176 80 V128Z" fill={deep} />
      <path d="M86 76 C96 64 110 64 118 74" fill={deep} />
      <path d="M92 82 C100 96 100 112 92 126" stroke={W} strokeOpacity=".35" strokeWidth="4" fill="none" />
      <circle cx="64" cy="98" r="7" fill={W} />
      <circle cx="62" cy="98" r="3.5" fill={deep} />
      {[[40, 66, 6], [30, 48, 4]].map(([cx, cy, r]) => <circle key={cy} cx={cx} cy={cy} r={r} fill="none" stroke={W} strokeWidth="2.5" />)}
      <path d="M106 112 c8 0 14 6 14 6" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  car: ({ fg, accent }) => (
    <>
      {shadow(72, 160)}
      <path d="M26 132 C26 118 34 112 46 110 L64 84 C68 78 74 76 82 76 H122 C130 76 136 80 140 86 L156 110 C168 112 176 118 176 130 V140 C176 144 172 148 168 148 H34 C30 148 26 144 26 140Z" fill={fg} />
      <path d="M72 86 C74 82 78 82 82 82 H98 V108 H58Z" fill={W} opacity=".85" />
      <path d="M104 82 H122 C128 82 132 84 134 88 L146 108 H104Z" fill={W} opacity=".85" />
      <rect x="160" y="118" width="14" height="8" rx="3" fill={accent} />
      <rect x="26" y="120" width="10" height="8" rx="3" fill={W} />
      {[60, 142].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="148" r="18" fill="#1c1c1c" />
          <circle cx={cx} cy="148" r="8" fill={accent} />
        </g>
      ))}
    </>
  ),
  ticket: ({ fg, deep, accent }) => (
    <>
      {shadow(62)}
      <g transform="rotate(-10 100 104)">
        <path d="M34 70 H166 V92 a12 12 0 0 0 0 24 V138 H34 V116 a12 12 0 0 0 0 -24Z" fill={fg} />
        <path d="M128 72 V136" stroke={W} strokeOpacity=".7" strokeWidth="3" strokeDasharray="6 6" />
        <path d="M80 86 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2z" fill={accent} />
        <rect x="138" y="86" width="16" height="36" rx="3" fill={deep} opacity=".5" />
      </g>
    </>
  ),
  heart: ({ fg, deep, accent }) => (
    <>
      {shadow(50)}
      <path d="M100 160 C100 160 34 120 34 80 C34 58 50 44 68 44 C82 44 94 52 100 64 C106 52 118 44 132 44 C150 44 166 58 166 80 C166 120 100 160 100 160Z" fill={fg} />
      <path d="M58 64 a18 18 0 0 1 14 -8" stroke={W} strokeOpacity=".5" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M100 104 C88 92 92 78 100 72 C108 78 112 92 100 104Z M100 104 C86 104 76 96 74 86 C86 84 96 90 100 104Z M100 104 C114 104 124 96 126 86 C114 84 104 90 100 104Z" fill={accent} />
      <circle cx="100" cy="104" r="3" fill={deep} />
    </>
  ),
  paw: ({ fg, deep }) => (
    <>
      {shadow(50)}
      <path d="M100 98 C124 98 144 120 144 138 C144 156 128 160 100 156 C72 160 56 156 56 138 C56 120 76 98 100 98Z" fill={fg} />
      {[[60, 86, -20], [84, 64, -6], [116, 64, 6], [140, 86, 20]].map(([cx, cy, r]) => <ellipse key={cx} cx={cx} cy={cy} rx="13" ry="18" transform={`rotate(${r} ${cx} ${cy})`} fill={fg} />)}
      <ellipse cx="82" cy="114" rx="5" ry="8" fill={W} opacity=".3" />
      <circle cx="100" cy="132" r="4" fill={deep} opacity=".25" />
    </>
  ),
  planet: ({ fg, deep, accent }) => (
    <>
      {[[44, 50, 3], [160, 46, 2.5], [150, 160, 3], [40, 150, 2]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={W} />)}
      <circle cx="100" cy="100" r="44" fill={fg} />
      <path d="M64 84 C80 92 120 92 140 80 M58 108 C84 116 120 116 142 104" stroke={deep} strokeOpacity=".5" strokeWidth="6" fill="none" />
      <ellipse cx="100" cy="104" rx="76" ry="18" transform="rotate(-16 100 104)" stroke={accent} strokeWidth="7" fill="none" />
      <path d="M58 78 A44 44 0 0 1 100 56 A44 44 0 0 1 144 100 L100 100Z" fill={fg} />
      <path d="M72 70 a34 34 0 0 1 22 -10" stroke={W} strokeOpacity=".4" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  columns: ({ fg, deep, accent }) => (
    <>
      {shadow(68)}
      <path d="M100 36 L162 68 H38Z" fill={W} />
      <circle cx="100" cy="58" r="6" fill={accent} />
      <rect x="38" y="68" width="124" height="10" fill={fg} />
      {[50, 78, 110, 138].map((x) => (
        <g key={x}>
          <rect x={x} y="78" width="14" height="70" fill={W} />
          <path d={`M${x + 5} 82 V144 M${x + 9} 82 V144`} stroke={fg} strokeOpacity=".25" strokeWidth="1.5" />
        </g>
      ))}
      <rect x="34" y="148" width="132" height="10" fill={fg} />
      <rect x="28" y="158" width="144" height="10" fill={deep} />
    </>
  ),
  hammer: ({ fg, deep, accent }) => (
    <>
      {shadow(60)}
      <g transform="rotate(-35 100 104)">
        <rect x="93" y="64" width="14" height="106" rx="6" fill="#e2b77f" />
        <rect x="93" y="136" width="14" height="34" rx="6" fill={accent} />
        <path d="M60 46 H132 C140 46 146 52 146 60 V72 H60 C54 72 50 66 50 60 C50 52 54 46 60 46Z" fill={fg} />
        <path d="M50 60 C38 60 32 52 30 44 C40 48 48 48 54 50Z" fill={deep} />
        <rect x="88" y="44" width="24" height="30" rx="3" fill={deep} />
        <rect x="64" y="51" width="20" height="4" rx="2" fill={W} opacity=".35" />
      </g>
    </>
  ),
  generic: ({ fg, deep, accent }) => (
    <>
      {shadow(60)}
      <circle cx="78" cy="78" r="34" fill={accent} />
      <rect x="92" y="80" width="64" height="64" rx="10" fill={fg} />
      <path d="M44 166 L82 104 L120 166Z" fill={W} opacity=".92" />
      <circle cx="140" cy="60" r="10" fill={deep} />
    </>
  ),
};
