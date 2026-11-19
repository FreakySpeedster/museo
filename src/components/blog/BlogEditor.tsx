"use client";

import clsx from "clsx";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Code, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered,
  Minus, Quote, Redo2, RemoveFormatting, SquareCode, Strikethrough, Underline, Undo2, Unlink, type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { ApiError, api } from "@/lib/client";
import { readPhotoFile } from "@/components/profile/PhotoPicker";
import { Menu } from "@/components/ui/Menu";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const BLOCKS = [
  { id: "p", label: "Paragraph" },
  { id: "h1", label: "Heading 1" },
  { id: "h2", label: "Heading 2" },
  { id: "h3", label: "Heading 3" },
  { id: "h4", label: "Heading 4" },
] as const;

/** Rich text editor for blog posts (Tiptap, free extensions only). Emits HTML; the server sanitizes it. */
export function BlogEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow ugc", target: "_blank" } },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight,
      Placeholder.configure({ placeholder: "Tell the story. What is it like, who is it for, would you buy it again?" }),
    ],
    content: initialHtml || "",
    editorProps: { attributes: { class: "prose-museo", "aria-label": "Post body", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div className="museo-editor rounded-3xl border border-border bg-surface focus-within:border-accent/60 max-md:rounded-none max-md:border-0 max-md:bg-transparent">
      {editor ? <Toolbar editor={editor} /> : <div className="h-12 border-b border-border" />}
      <div className="py-5 md:px-8 md:py-7">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const keyboard = useKeyboardInset();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [bar, setBar] = useState<null | "link" | "image">(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      block: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("heading", { level: 4 }) ? "h4" : "p",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  function openBar(kind: "link" | "image") {
    setUrl(kind === "link" ? (editor.getAttributes("link").href ?? "") : "");
    setBar(kind);
  }

  function applyUrl() {
    const v = url.trim();
    if (bar === "link") {
      if (!v) chain().extendMarkRange("link").unsetLink().run();
      else chain().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/i.test(v) ? v : `https://${v}` }).run();
    } else if (bar === "image" && v) {
      if (!/^https:\/\//i.test(v)) return toast.error("Use an https:// image link.");
      chain().setImage({ src: v }).run();
    }
    setBar(null);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const { file: f, error } = await readPhotoFile(file);
    if (!f) return toast.error(error ?? "That image couldn't be used.");
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", f);
      const { url: src } = await api<{ url: string }>("/api/blog/images", { form });
      chain().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't upload that image");
    } finally {
      setUploading(false);
    }
  }

  const setBlock = (id: (typeof BLOCKS)[number]["id"]) =>
    id === "p" ? chain().setParagraph().run() : chain().setHeading({ level: Number(id.slice(1)) as 1 | 2 | 3 | 4 }).run();

  return (
    <div
      data-testid="editor-toolbar"
      style={{ "--kb": `${keyboard}px` } as React.CSSProperties}
      className="sticky top-0 z-10 rounded-t-3xl border-b border-border bg-surface/95 backdrop-blur max-md:fixed max-md:inset-x-0 max-md:bottom-[var(--kb)] max-md:top-auto max-md:z-nav max-md:flex max-md:flex-col-reverse max-md:rounded-none max-md:border-b-0 max-md:border-t max-md:bg-background/95 max-md:pb-[env(safe-area-inset-bottom)]"
    >
      <div role="toolbar" aria-label="Formatting" className="no-scrollbar flex flex-wrap items-center gap-0.5 px-2 py-1.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:py-0.5 sm:px-3">
        <Tool icon={Undo2} label="Undo" onClick={() => chain().undo().run()} disabled={!s.canUndo} />
        <Tool icon={Redo2} label="Redo" onClick={() => chain().redo().run()} disabled={!s.canRedo} />
        <Sep />
        <Menu
          label="Text style"
          align="start"
          items={BLOCKS.map((b) => ({ label: b.label, onSelect: () => setBlock(b.id) }))}
          trigger={({ props }) => (
            <button type="button" {...props} className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-meta font-medium text-foreground hover:bg-surface-hover max-md:h-11">
              {BLOCKS.find((b) => b.id === s.block)?.label}
              <ChevronDown className="size-3.5 text-muted" aria-hidden />
            </button>
          )}
        />
        <Sep />
        <Tool icon={Bold} label="Bold" shortcut="Mod+B" active={s.bold} onClick={() => chain().toggleBold().run()} />
        <Tool icon={Italic} label="Italic" shortcut="Mod+I" active={s.italic} onClick={() => chain().toggleItalic().run()} />
        <Tool icon={Underline} label="Underline" shortcut="Mod+U" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
        <Tool icon={Strikethrough} label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()} />
        <Tool icon={Highlighter} label="Highlight" active={s.highlight} onClick={() => chain().toggleHighlight().run()} />
        <Tool icon={Code} label="Inline code" active={s.code} onClick={() => chain().toggleCode().run()} />
        <Tool icon={Link2} label="Link" active={s.link || bar === "link"} onClick={() => openBar("link")} />
        {s.link && <Tool icon={Unlink} label="Remove link" onClick={() => chain().extendMarkRange("link").unsetLink().run()} />}
        <Sep />
        <Tool icon={List} label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
        <Tool icon={ListOrdered} label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
        <Tool icon={Quote} label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()} />
        <Tool icon={SquareCode} label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()} />
        <Sep />
        <Tool icon={AlignLeft} label="Align left" active={s.align === "left"} onClick={() => chain().setTextAlign("left").run()} />
        <Tool icon={AlignCenter} label="Align center" active={s.align === "center"} onClick={() => chain().setTextAlign("center").run()} />
        <Tool icon={AlignRight} label="Align right" active={s.align === "right"} onClick={() => chain().setTextAlign("right").run()} />
        <Tool icon={AlignJustify} label="Justify" active={s.align === "justify"} onClick={() => chain().setTextAlign("justify").run()} />
        <Sep />
        <Tool icon={Minus} label="Divider" onClick={() => chain().setHorizontalRule().run()} />
        <Menu
          label="Insert image"
          align="start"
          items={[
            { label: "Upload an image", onSelect: () => fileInput.current?.click() },
            { label: "Image from a link", onSelect: () => openBar("image") },
          ]}
          trigger={({ props }) => (
            <button type="button" {...props} aria-label="Insert image" title="Insert image" disabled={uploading} className={toolClass(bar === "image")}>
              <ImagePlus className="size-4" aria-hidden />
            </button>
          )}
        />
        <Tool icon={RemoveFormatting} label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()} />
        {uploading && <span className="ml-1 text-caption text-muted">Uploading…</span>}
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {bar && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          <input
            autoFocus
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
              if (e.key === "Escape") setBar(null);
            }}
            placeholder={bar === "link" ? "Paste a link" : "https://… image link"}
            aria-label={bar === "link" ? "Link address" : "Image address"}
            className="h-9 min-w-0 flex-1 rounded-full border border-border bg-surface-hover px-3.5 text-meta outline-none focus:border-accent focus:bg-surface"
          />
          <Button size="sm" onClick={applyUrl}>{bar === "link" ? (url.trim() ? "Apply" : "Remove link") : "Insert"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setBar(null)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

const toolClass = (active?: boolean) =>
  clsx(
    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40 max-md:size-11",
    active ? "bg-foreground text-background" : "text-muted hover:bg-surface-hover hover:text-foreground",
  );

function Tool({ icon: Icon, label, onClick, active, disabled, shortcut }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean; disabled?: boolean; shortcut?: string }) {
  const hint = shortcut ? `${label} (${shortcut.replace("Mod", typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl")})` : label;
  return (
    <button type="button" aria-label={label} aria-pressed={active ?? undefined} title={hint} onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled} className={toolClass(active)}>
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function Sep(): ReactNode {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;
}
