"use client";

/**
 * visual-email-builder.tsx
 * ────────────────────────
 * Full-screen, drag-and-drop email template builder.
 * Zero external builder dependencies — pure React + Tailwind.
 *
 * Props:
 *   initialBlocks  – pre-loaded block state (for editing existing templates)
 *   initialHtml    – fallback HTML to parse if no blocks (for legacy templates)
 *   templateName   – initial name shown in the top bar
 *   onSave(html, designJson, name) – called when "Save Template" is clicked
 *   onBack()       – called when "← Back" is clicked (cancel / close)
 */

import React, { useState, useRef, useCallback, useEffect, useId } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  ArrowLeft,
  Save,
  Eye,
  Monitor,
  Smartphone,
  X,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Copy,
  Braces,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Palette,
  Columns,
  Quote,
  Share2,
  Star,
  CheckSquare,
  Table,
  Video,
  Code,
  AtSign,
  Gift,
  Zap,
  BarChart2,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type BlockType =
  | "header"
  | "hero"
  | "text"
  | "heading"
  | "button"
  | "image"
  | "divider"
  | "spacer"
  | "two-column"
  | "three-column"
  | "bullet-list"
  | "numbered-list"
  | "quote"
  | "social"
  | "footer"
  | "feature-row"
  | "stats-row"
  | "testimonial"
  | "code-block"
  | "video-preview"
  | "product-card"
  | "countdown"
  | "signature"
  | "table";

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface HeaderBlock extends BlockBase {
  type: "header";
  logoUrl: string;
  brandName: string;
  bgColor: string;
  textColor: string;
  logoWidth: number;
  alignment: "left" | "center" | "right";
}

export interface HeroBlock extends BlockBase {
  type: "hero";
  heading: string;
  subtext: string;
  bgColor: string;
  textColor: string;
  btnLabel: string;
  btnUrl: string;
  btnBg: string;
  btnTextColor: string;
  btnRadius: number;
  alignment: "left" | "center" | "right";
  showButton: boolean;
  paddingY: number;
}

export interface TextBlock extends BlockBase {
  type: "text";
  content: string;
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right";
  bgColor: string;
  paddingY: number;
  lineHeight: number;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  content: string;
  level: 1 | 2 | 3;
  color: string;
  bgColor: string;
  alignment: "left" | "center" | "right";
  paddingY: number;
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  label: string;
  url: string;
  bgColor: string;
  textColor: string;
  radius: number;
  alignment: "left" | "center" | "right";
  fontSize: number;
  paddingX: number;
  paddingY: number;
  fullWidth: boolean;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  width: number;
  alignment: "left" | "center" | "right";
  linkUrl: string;
  borderRadius: number;
  bgColor: string;
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  color: string;
  thickness: number;
  marginY: number;
  style: "solid" | "dashed" | "dotted";
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  height: number;
  bgColor: string;
}

export interface TwoColumnBlock extends BlockBase {
  type: "two-column";
  leftContent: string;
  rightContent: string;
  leftBg: string;
  rightBg: string;
  bgColor: string;
  gap: number;
  ratio: "50-50" | "60-40" | "40-60" | "70-30" | "30-70";
}

export interface ThreeColumnBlock extends BlockBase {
  type: "three-column";
  col1: string;
  col2: string;
  col3: string;
  bgColor: string;
  gap: number;
}

export interface BulletListBlock extends BlockBase {
  type: "bullet-list";
  items: string[];
  color: string;
  bgColor: string;
  fontSize: number;
  bulletColor: string;
  lineHeight: number;
}

export interface NumberedListBlock extends BlockBase {
  type: "numbered-list";
  items: string[];
  color: string;
  bgColor: string;
  fontSize: number;
  numberColor: string;
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  content: string;
  author: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  fontSize: number;
}

export interface SocialBlock extends BlockBase {
  type: "social";
  links: { platform: string; url: string; label: string }[];
  bgColor: string;
  iconColor: string;
  alignment: "left" | "center" | "right";
  showLabels: boolean;
}

export interface FooterBlock extends BlockBase {
  type: "footer";
  companyName: string;
  address: string;
  unsubscribeText: string;
  bgColor: string;
  textColor: string;
  showUnsubscribe: boolean;
  showAddress: boolean;
}

export interface FeatureRowBlock extends BlockBase {
  type: "feature-row";
  features: { icon: string; title: string; desc: string }[];
  bgColor: string;
  textColor: string;
  columns: 2 | 3;
}

export interface StatsRowBlock extends BlockBase {
  type: "stats-row";
  stats: { value: string; label: string }[];
  bgColor: string;
  valueColor: string;
  labelColor: string;
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  quote: string;
  author: string;
  role: string;
  avatarUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export interface CodeBlockBlock extends BlockBase {
  type: "code-block";
  code: string;
  language: string;
  bgColor: string;
  textColor: string;
}

export interface VideoPreviewBlock extends BlockBase {
  type: "video-preview";
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
  bgColor: string;
}

export interface ProductCardBlock extends BlockBase {
  type: "product-card";
  imageUrl: string;
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  btnLabel: string;
  btnUrl: string;
  btnBg: string;
  bgColor: string;
  layout: "horizontal" | "vertical";
}

export interface CountdownBlock extends BlockBase {
  type: "countdown";
  label: string;
  targetDate: string;
  bgColor: string;
  textColor: string;
  numberBg: string;
  numberColor: string;
}

export interface SignatureBlock extends BlockBase {
  type: "signature";
  name: string;
  title: string;
  email: string;
  phone: string;
  company: string;
  avatarUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  showAvatar: boolean;
}

export interface TableBlock extends BlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
  headerBg: string;
  headerColor: string;
  stripedRows: boolean;
  borderColor: string;
  bgColor: string;
}

export type EmailBlock =
  | HeaderBlock
  | HeroBlock
  | TextBlock
  | HeadingBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | TwoColumnBlock
  | ThreeColumnBlock
  | BulletListBlock
  | NumberedListBlock
  | QuoteBlock
  | SocialBlock
  | FooterBlock
  | FeatureRowBlock
  | StatsRowBlock
  | TestimonialBlock
  | CodeBlockBlock
  | VideoPreviewBlock
  | ProductCardBlock
  | CountdownBlock
  | SignatureBlock
  | TableBlock;

export interface GlobalSettings {
  emailBgColor: string;
  contentWidth: number;
  contentBgColor: string;
  fontFamily: string;
  defaultTextColor: string;
  defaultFontSize: number;
}

export interface DesignJson {
  blocks: EmailBlock[];
  globalSettings: GlobalSettings;
  version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES
// ─────────────────────────────────────────────────────────────────────────────

const VARIABLES = [
  { label: "First Name", token: "{first_name}", example: "John" },
  { label: "Last Name", token: "{last_name}", example: "Doe" },
  { label: "Full Name", token: "{full_name}", example: "John Doe" },
  { label: "Email", token: "{email}", example: "john@example.com" },
  { label: "Company", token: "{company}", example: "Acme Inc." },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultBlock(type: BlockType): EmailBlock {
  const id = makeId();
  switch (type) {
    case "header":
      return {
        id,
        type,
        logoUrl: "",
        brandName: "Your Brand",
        bgColor: "#1e3a8a",
        textColor: "#ffffff",
        logoWidth: 140,
        alignment: "center",
      };
    case "hero":
      return {
        id,
        type,
        heading: "Welcome to Our Newsletter",
        subtext:
          "Stay updated with the latest news and exclusive offers just for you.",
        bgColor: "#eff6ff",
        textColor: "#111827",
        btnLabel: "Get Started →",
        btnUrl: "#",
        btnBg: "#2563eb",
        btnTextColor: "#ffffff",
        btnRadius: 8,
        alignment: "center",
        showButton: true,
        paddingY: 48,
      };
    case "text":
      return {
        id,
        type,
        content:
          "Write your email content here. You can use variables like {first_name} to personalise each email.",
        fontSize: 15,
        color: "#374151",
        alignment: "left",
        bgColor: "#ffffff",
        paddingY: 12,
        lineHeight: 1.7,
      };
    case "heading":
      return {
        id,
        type,
        content: "Section Heading",
        level: 2,
        color: "#111827",
        bgColor: "#ffffff",
        alignment: "left",
        paddingY: 8,
      };
    case "button":
      return {
        id,
        type,
        label: "Click Here →",
        url: "#",
        bgColor: "#2563eb",
        textColor: "#ffffff",
        radius: 8,
        alignment: "center",
        fontSize: 15,
        paddingX: 28,
        paddingY: 13,
        fullWidth: false,
      };
    case "image":
      return {
        id,
        type,
        src: "",
        alt: "Image",
        width: 100,
        alignment: "center",
        linkUrl: "",
        borderRadius: 8,
        bgColor: "#ffffff",
      };
    case "divider":
      return {
        id,
        type,
        color: "#e5e7eb",
        thickness: 1,
        marginY: 24,
        style: "solid",
      };
    case "spacer":
      return { id, type, height: 32, bgColor: "transparent" };
    case "two-column":
      return {
        id,
        type,
        leftContent: "Left column content. Add your text here.",
        rightContent: "Right column content. Add your text here.",
        leftBg: "#ffffff",
        rightBg: "#ffffff",
        bgColor: "#ffffff",
        gap: 24,
        ratio: "50-50",
      };
    case "three-column":
      return {
        id,
        type,
        col1: "Column one content.",
        col2: "Column two content.",
        col3: "Column three content.",
        bgColor: "#ffffff",
        gap: 16,
      };
    case "bullet-list":
      return {
        id,
        type,
        items: [
          "First important point",
          "Second important point",
          "Third important point",
        ],
        color: "#374151",
        bgColor: "#ffffff",
        fontSize: 15,
        bulletColor: "#2563eb",
        lineHeight: 1.6,
      };
    case "numbered-list":
      return {
        id,
        type,
        items: [
          "First step to get started",
          "Second step in the process",
          "Third step to complete",
        ],
        color: "#374151",
        bgColor: "#ffffff",
        fontSize: 15,
        numberColor: "#2563eb",
      };
    case "quote":
      return {
        id,
        type,
        content:
          "This is an inspiring quote or important message that you want to highlight for your readers.",
        author: "— Author Name",
        borderColor: "#2563eb",
        bgColor: "#eff6ff",
        textColor: "#1e40af",
        fontSize: 16,
      };
    case "social":
      return {
        id,
        type,
        links: [
          { platform: "Twitter", url: "#", label: "Twitter" },
          { platform: "LinkedIn", url: "#", label: "LinkedIn" },
          { platform: "Instagram", url: "#", label: "Instagram" },
        ],
        bgColor: "#f9fafb",
        iconColor: "#374151",
        alignment: "center",
        showLabels: true,
      };
    case "footer":
      return {
        id,
        type,
        companyName: "Your Company",
        address: "123 Main Street, City, Country",
        unsubscribeText: "Unsubscribe from this list",
        bgColor: "#f3f4f6",
        textColor: "#9ca3af",
        showUnsubscribe: true,
        showAddress: true,
      };
    case "feature-row":
      return {
        id,
        type,
        features: [
          {
            icon: "⚡",
            title: "Fast",
            desc: "Lightning fast performance for your workflow.",
          },
          {
            icon: "🔒",
            title: "Secure",
            desc: "Enterprise-grade security built right in.",
          },
          {
            icon: "📊",
            title: "Analytics",
            desc: "Deep insights to help you grow faster.",
          },
        ],
        bgColor: "#ffffff",
        textColor: "#374151",
        columns: 3,
      };
    case "stats-row":
      return {
        id,
        type,
        stats: [
          { value: "12,450", label: "Happy Customers" },
          { value: "98%", label: "Satisfaction Rate" },
          { value: "24/7", label: "Support Available" },
        ],
        bgColor: "#1e3a8a",
        valueColor: "#ffffff",
        labelColor: "#bfdbfe",
      };
    case "testimonial":
      return {
        id,
        type,
        quote:
          "This is an amazing product. It has completely changed how our team works and we couldn't be happier with the results.",
        author: "Sarah Johnson",
        role: "CEO, Acme Corp",
        avatarUrl: "",
        bgColor: "#f9fafb",
        textColor: "#374151",
        accentColor: "#2563eb",
      };
    case "code-block":
      return {
        id,
        type,
        code: "// Your code snippet here\nconst result = await fetch('/api/data');\nconst data = await result.json();",
        language: "javascript",
        bgColor: "#1e1e2e",
        textColor: "#cdd6f4",
      };
    case "video-preview":
      return {
        id,
        type,
        thumbnailUrl: "",
        videoUrl: "#",
        title: "Watch Our Latest Video",
        bgColor: "#ffffff",
      };
    case "product-card":
      return {
        id,
        type,
        imageUrl: "",
        name: "Product Name",
        description:
          "A brief description of this amazing product and why your customers need it.",
        price: "$29.00",
        originalPrice: "$49.00",
        btnLabel: "Buy Now →",
        btnUrl: "#",
        btnBg: "#2563eb",
        bgColor: "#ffffff",
        layout: "vertical",
      };
    case "countdown":
      return {
        id,
        type,
        label: "Offer ends in:",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        bgColor: "#1e3a8a",
        textColor: "#bfdbfe",
        numberBg: "#1d4ed8",
        numberColor: "#ffffff",
      };
    case "signature":
      return {
        id,
        type,
        name: "{full_name}",
        title: "Your Title",
        email: "{email}",
        phone: "+1 (555) 000-0000",
        company: "Your Company",
        avatarUrl: "",
        bgColor: "#ffffff",
        textColor: "#374151",
        accentColor: "#2563eb",
        showAvatar: false,
      };
    case "table":
      return {
        id,
        type,
        headers: ["Column A", "Column B", "Column C"],
        rows: [
          ["Row 1, Col A", "Row 1, Col B", "Row 1, Col C"],
          ["Row 2, Col A", "Row 2, Col B", "Row 2, Col C"],
        ],
        headerBg: "#1e3a8a",
        headerColor: "#ffffff",
        stripedRows: true,
        borderColor: "#e5e7eb",
        bgColor: "#ffffff",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML EXPORT ENGINE — produces clean inline-styled email HTML
// ─────────────────────────────────────────────────────────────────────────────

function escHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(txt: string): string {
  // Convert plain text with newlines to HTML paragraphs, preserving variable tokens
  return txt
    .split(/\n\n+/)
    .map(
      (para) =>
        `<p style="margin:0 0 14px 0;">${para.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function blockToHtml(block: EmailBlock, gs: GlobalSettings): string {
  const W = gs.contentWidth;
  const wrap = (inner: string, bg = "#ffffff", pad = "0") =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};"><tr><td style="padding:${pad};">${inner}</td></tr></table>`;

  switch (block.type) {
    case "header": {
      const b = block as HeaderBlock;
      const logoHtml = b.logoUrl
        ? `<img src="${escHtml(b.logoUrl)}" alt="${escHtml(b.brandName)}" width="${b.logoWidth}" style="display:block;height:auto;${b.alignment !== "center" ? "" : "margin:0 auto;"}" />`
        : `<span style="font-size:22px;font-weight:800;color:${b.textColor};font-family:${gs.fontFamily};">${escHtml(b.brandName)}</span>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:20px 32px;text-align:${b.alignment};">${logoHtml}</td></tr></table>`;
    }
    case "hero": {
      const b = block as HeroBlock;
      const btn = b.showButton
        ? `<a href="${escHtml(b.btnUrl)}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${b.btnBg};color:${b.btnTextColor};text-decoration:none;font-weight:700;font-size:16px;border-radius:${b.btnRadius}px;font-family:${gs.fontFamily};">${escHtml(b.btnLabel)}</a>`
        : "";
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 48px;text-align:${b.alignment};"><h1 style="margin:0 0 12px 0;font-size:32px;font-weight:800;color:${b.textColor};line-height:1.2;font-family:${gs.fontFamily};">${escHtml(b.heading)}</h1><p style="margin:0;font-size:17px;color:${b.textColor};opacity:0.85;line-height:1.6;font-family:${gs.fontFamily};">${escHtml(b.subtext)}</p>${btn}</td></tr></table>`;
    }
    case "text": {
      const b = block as TextBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 48px;"><div style="font-size:${b.fontSize}px;color:${b.color};text-align:${b.alignment};line-height:${b.lineHeight};font-family:${gs.fontFamily};">${textToHtml(b.content)}</div></td></tr></table>`;
    }
    case "heading": {
      const b = block as HeadingBlock;
      const sizes: Record<number, string> = { 1: "30px", 2: "22px", 3: "17px" };
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 48px;"><h${b.level} style="margin:0;font-size:${sizes[b.level]};font-weight:700;color:${b.color};text-align:${b.alignment};font-family:${gs.fontFamily};">${escHtml(b.content)}</h${b.level}></td></tr></table>`;
    }
    case "button": {
      const b = block as ButtonBlock;
      const tableAlign =
        b.alignment === "center"
          ? "center"
          : b.alignment === "right"
            ? "right"
            : "left";
      const width = b.fullWidth ? "100%" : "auto";
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;"><tr><td style="padding:12px 48px;text-align:${tableAlign};"><a href="${escHtml(b.url)}" style="display:inline-block;width:${width};padding:${b.paddingY}px ${b.paddingX}px;background:${b.bgColor};color:${b.textColor};text-decoration:none;font-weight:700;font-size:${b.fontSize}px;border-radius:${b.radius}px;text-align:center;font-family:${gs.fontFamily};">${escHtml(b.label)}</a></td></tr></table>`;
    }
    case "image": {
      const b = block as ImageBlock;
      if (!b.src)
        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 48px;text-align:${b.alignment};"><div style="display:inline-block;background:#f3f4f6;border:2px dashed #d1d5db;border-radius:${b.borderRadius}px;padding:32px;color:#9ca3af;font-size:14px;">📷 Image placeholder — add URL in properties</div></td></tr></table>`;
      const imgTag = `<img src="${escHtml(b.src)}" alt="${escHtml(b.alt)}" style="display:block;${b.alignment === "center" ? "margin:0 auto;" : ""}width:${b.width}%;max-width:100%;height:auto;border-radius:${b.borderRadius}px;" />`;
      const inner = b.linkUrl
        ? `<a href="${escHtml(b.linkUrl)}" style="display:block;">${imgTag}</a>`
        : imgTag;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 48px;text-align:${b.alignment};">${inner}</td></tr></table>`;
    }
    case "divider": {
      const b = block as DividerBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:${b.marginY}px 48px;"><hr style="border:none;border-top:${b.thickness}px ${b.style} ${b.color};margin:0;" /></td></tr></table>`;
    }
    case "spacer": {
      const b = block as SpacerBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor || "transparent"};"><tr><td style="height:${b.height}px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
    }
    case "two-column": {
      const b = block as TwoColumnBlock;
      const ratios: Record<string, [string, string]> = {
        "50-50": ["50%", "50%"],
        "60-40": ["60%", "40%"],
        "40-60": ["40%", "60%"],
        "70-30": ["70%", "30%"],
        "30-70": ["30%", "70%"],
      };
      const [lw, rw] = ratios[b.ratio] || ["50%", "50%"];
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="${lw}" valign="top" style="padding:16px;background:${b.leftBg};font-size:15px;color:#374151;line-height:1.6;font-family:${gs.fontFamily};">${textToHtml(b.leftContent)}</td><td width="${b.gap}px" style="font-size:0;">&nbsp;</td><td width="${rw}" valign="top" style="padding:16px;background:${b.rightBg};font-size:15px;color:#374151;line-height:1.6;font-family:${gs.fontFamily};">${textToHtml(b.rightContent)}</td></tr></table></td></tr></table>`;
    }
    case "three-column": {
      const b = block as ThreeColumnBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="33%" valign="top" style="padding:12px;font-size:14px;color:#374151;line-height:1.6;font-family:${gs.fontFamily};">${textToHtml(b.col1)}</td><td width="${b.gap}px">&nbsp;</td><td width="33%" valign="top" style="padding:12px;font-size:14px;color:#374151;line-height:1.6;font-family:${gs.fontFamily};">${textToHtml(b.col2)}</td><td width="${b.gap}px">&nbsp;</td><td width="33%" valign="top" style="padding:12px;font-size:14px;color:#374151;line-height:1.6;font-family:${gs.fontFamily};">${textToHtml(b.col3)}</td></tr></table></td></tr></table>`;
    }
    case "bullet-list": {
      const b = block as BulletListBlock;
      const items = b.items
        .map(
          (item) =>
            `<li style="margin-bottom:8px;color:${b.color};font-size:${b.fontSize}px;line-height:${b.lineHeight};">${escHtml(item)}</li>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:12px 48px;"><ul style="margin:0;padding-left:24px;color:${b.bulletColor};">${items}</ul></td></tr></table>`;
    }
    case "numbered-list": {
      const b = block as NumberedListBlock;
      const items = b.items
        .map(
          (item) =>
            `<li style="margin-bottom:8px;color:${b.color};font-size:${b.fontSize}px;line-height:1.6;">${escHtml(item)}</li>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:12px 48px;"><ol style="margin:0;padding-left:24px;color:${b.numberColor};">${items}</ol></td></tr></table>`;
    }
    case "quote": {
      const b = block as QuoteBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:24px 48px;border-left:4px solid ${b.borderColor};"><p style="margin:0 0 8px 0;font-size:${b.fontSize}px;color:${b.textColor};font-style:italic;line-height:1.6;font-family:${gs.fontFamily};">${escHtml(b.content)}</p><p style="margin:0;font-size:13px;color:${b.textColor};opacity:0.7;font-weight:600;">${escHtml(b.author)}</p></td></tr></table>`;
    }
    case "social": {
      const b = block as SocialBlock;
      const links = b.links
        .map(
          (l) =>
            `<a href="${escHtml(l.url)}" style="display:inline-block;margin:0 8px;color:${b.iconColor};text-decoration:none;font-size:13px;font-weight:600;font-family:${gs.fontFamily};">${escHtml(b.showLabels ? l.label : l.platform)}</a>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:20px 48px;text-align:${b.alignment};">${links}</td></tr></table>`;
    }
    case "footer": {
      const b = block as FooterBlock;
      const address = b.showAddress
        ? `<p style="margin:4px 0;font-size:12px;color:${b.textColor};">${escHtml(b.address)}</p>`
        : "";
      const unsub = b.showUnsubscribe
        ? `<p style="margin:8px 0 0 0;font-size:12px;color:${b.textColor};"><a href="{{unsubscribe_url}}" style="color:${b.textColor};text-decoration:underline;">${escHtml(b.unsubscribeText)}</a></p>`
        : "";
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};border-top:1px solid #e5e7eb;"><tr><td style="padding:24px 48px;text-align:center;"><p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:${b.textColor};">${escHtml(b.companyName)}</p>${address}${unsub}</td></tr></table>`;
    }
    case "feature-row": {
      const b = block as FeatureRowBlock;
      const cols = b.features
        .map(
          (f) =>
            `<td valign="top" style="padding:16px;text-align:center;"><p style="font-size:32px;margin:0 0 8px 0;">${f.icon}</p><h3 style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:${b.textColor};font-family:${gs.fontFamily};">${escHtml(f.title)}</h3><p style="margin:0;font-size:13px;color:${b.textColor};opacity:0.75;line-height:1.5;font-family:${gs.fontFamily};">${escHtml(f.desc)}</p></td>`,
        )
        .join("<td width='16'>&nbsp;</td>");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:32px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cols}</tr></table></td></tr></table>`;
    }
    case "stats-row": {
      const b = block as StatsRowBlock;
      const cols = b.stats
        .map(
          (s) =>
            `<td valign="middle" style="padding:20px;text-align:center;"><p style="margin:0 0 4px 0;font-size:32px;font-weight:800;color:${b.valueColor};font-family:${gs.fontFamily};">${escHtml(s.value)}</p><p style="margin:0;font-size:13px;color:${b.labelColor};font-weight:500;letter-spacing:0.05em;text-transform:uppercase;font-family:${gs.fontFamily};">${escHtml(s.label)}</p></td>`,
        )
        .join(
          "<td width='1' style='background:rgba(255,255,255,0.15);'>&nbsp;</td>",
        );
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:0 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cols}</tr></table></td></tr></table>`;
    }
    case "testimonial": {
      const b = block as TestimonialBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:32px 48px;"><p style="margin:0 0 16px 0;font-size:32px;color:${b.accentColor};">"</p><p style="margin:0 0 16px 0;font-size:16px;color:${b.textColor};font-style:italic;line-height:1.6;font-family:${gs.fontFamily};">${escHtml(b.quote)}</p><p style="margin:0;font-size:14px;font-weight:700;color:${b.textColor};font-family:${gs.fontFamily};">${escHtml(b.author)}</p><p style="margin:2px 0 0 0;font-size:13px;color:${b.textColor};opacity:0.65;font-family:${gs.fontFamily};">${escHtml(b.role)}</p></td></tr></table>`;
    }
    case "code-block": {
      const b = block as CodeBlockBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:16px 48px;"><pre style="margin:0;padding:20px;background:${b.bgColor};color:${b.textColor};border-radius:8px;font-family:'Courier New',monospace;font-size:13px;line-height:1.6;overflow-x:auto;">${escHtml(b.code)}</pre></td></tr></table>`;
    }
    case "video-preview": {
      const b = block as VideoPreviewBlock;
      const thumb = b.thumbnailUrl
        ? `<img src="${escHtml(b.thumbnailUrl)}" alt="Video preview" style="display:block;width:100%;height:auto;border-radius:8px;" />`
        : `<div style="background:#1e293b;border-radius:8px;padding:48px;text-align:center;"><p style="margin:0;font-size:48px;">▶</p><p style="margin:8px 0 0 0;color:#94a3b8;font-size:14px;">${escHtml(b.title)}</p></div>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 48px;"><a href="${escHtml(b.videoUrl)}" style="display:block;">${thumb}</a>${b.title ? `<p style="margin:8px 0 0 0;font-size:14px;text-align:center;color:#374151;font-family:${gs.fontFamily};">${escHtml(b.title)}</p>` : ""}</td></tr></table>`;
    }
    case "product-card": {
      const b = block as ProductCardBlock;
      const img = b.imageUrl
        ? `<img src="${escHtml(b.imageUrl)}" alt="${escHtml(b.name)}" style="display:block;width:100%;height:auto;border-radius:8px 8px 0 0;" />`
        : `<div style="background:#f3f4f6;height:180px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;color:#9ca3af;font-size:13px;">📦 Add product image URL</div>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;"><tr><td>${img}</td></tr><tr><td style="padding:20px;"><h3 style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#111827;font-family:${gs.fontFamily};">${escHtml(b.name)}</h3><p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;line-height:1.5;font-family:${gs.fontFamily};">${escHtml(b.description)}</p><p style="margin:0 0 16px 0;"><span style="font-size:22px;font-weight:800;color:#111827;">${escHtml(b.price)}</span>${b.originalPrice ? `&nbsp;<span style="font-size:14px;color:#9ca3af;text-decoration:line-through;">${escHtml(b.originalPrice)}</span>` : ""}</p><a href="${escHtml(b.btnUrl)}" style="display:inline-block;padding:12px 24px;background:${b.btnBg};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;font-family:${gs.fontFamily};">${escHtml(b.btnLabel)}</a></td></tr></table></td></tr></table>`;
    }
    case "countdown": {
      const b = block as CountdownBlock;
      const boxes = ["Days", "Hours", "Minutes", "Seconds"]
        .map(
          (u) =>
            `<td style="padding:0 8px;text-align:center;"><div style="display:inline-block;min-width:64px;padding:12px 8px;background:${b.numberBg};border-radius:8px;"><p style="margin:0;font-size:28px;font-weight:800;color:${b.numberColor};font-family:${gs.fontFamily};">--</p><p style="margin:4px 0 0 0;font-size:11px;color:${b.textColor};text-transform:uppercase;letter-spacing:0.1em;">${u}</p></div></td>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:32px 48px;text-align:center;"><p style="margin:0 0 16px 0;font-size:14px;font-weight:600;color:${b.textColor};text-transform:uppercase;letter-spacing:0.1em;font-family:${gs.fontFamily};">${escHtml(b.label)}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>${boxes}</tr></table></td></tr></table>`;
    }
    case "signature": {
      const b = block as SignatureBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};border-top:2px solid ${b.accentColor};"><tr><td style="padding:24px 48px;"><p style="margin:0 0 2px 0;font-size:16px;font-weight:700;color:${b.textColor};font-family:${gs.fontFamily};">${escHtml(b.name)}</p><p style="margin:0 0 2px 0;font-size:13px;color:${b.textColor};opacity:0.7;font-family:${gs.fontFamily};">${escHtml(b.title)} · ${escHtml(b.company)}</p><p style="margin:4px 0 0 0;font-size:13px;color:${b.accentColor};font-family:${gs.fontFamily};"><a href="mailto:${escHtml(b.email)}" style="color:${b.accentColor};">${escHtml(b.email)}</a> · ${escHtml(b.phone)}</p></td></tr></table>`;
    }
    case "table": {
      const b = block as TableBlock;
      const thead = `<tr>${b.headers.map((h) => `<th style="padding:10px 12px;background:${b.headerBg};color:${b.headerColor};text-align:left;font-size:13px;font-weight:600;font-family:${gs.fontFamily};">${escHtml(h)}</th>`).join("")}</tr>`;
      const tbody = b.rows
        .map(
          (row, ri) =>
            `<tr style="background:${b.stripedRows && ri % 2 === 1 ? "#f9fafb" : b.bgColor};">${row.map((cell) => `<td style="padding:10px 12px;border-bottom:1px solid ${b.borderColor};font-size:14px;color:#374151;font-family:${gs.fontFamily};">${escHtml(cell)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${b.borderColor};border-radius:8px;overflow:hidden;border-collapse:collapse;">${thead}${tbody}</table></td></tr></table>`;
    }
    default:
      return "";
  }
}

export function buildEmailHtml(
  blocks: EmailBlock[],
  gs: GlobalSettings,
): string {
  const body = blocks.map((b) => blockToHtml(b, gs)).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Email</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,#bodyTable{margin:0;padding:0;width:100%;background:${gs.emailBgColor};}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
    table{border-collapse:collapse!important;}
    a{color:inherit;}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;}
      .mobile-pad{padding-left:16px!important;padding-right:16px!important;}
      .mobile-stack{display:block!important;width:100%!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${gs.emailBgColor};">
  <table id="bodyTable" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${gs.emailBgColor};">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">
        <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="${gs.contentWidth}" style="max-width:${gs.contentWidth}px;background:${gs.contentBgColor};border-radius:12px;overflow:hidden;">
          <tr>
            <td>
${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK CATALOGUE — what appears in the left sidebar
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK_CATALOGUE: {
  category: string;
  blocks: {
    type: BlockType;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[];
}[] = [
  {
    category: "Structure",
    blocks: [
      {
        type: "header",
        label: "Header",
        icon: <LayoutTemplate className="h-4 w-4" />,
        desc: "Logo & brand name",
      },
      {
        type: "hero",
        label: "Hero Banner",
        icon: <Star className="h-4 w-4" />,
        desc: "Bold heading + CTA",
      },
      {
        type: "two-column",
        label: "2 Columns",
        icon: <Columns className="h-4 w-4" />,
        desc: "Side-by-side layout",
      },
      {
        type: "three-column",
        label: "3 Columns",
        icon: <Columns className="h-4 w-4" />,
        desc: "Three-column grid",
      },
      {
        type: "footer",
        label: "Footer",
        icon: <AtSign className="h-4 w-4" />,
        desc: "Unsubscribe & company",
      },
    ],
  },
  {
    category: "Content",
    blocks: [
      {
        type: "heading",
        label: "Heading",
        icon: <Type className="h-4 w-4" />,
        desc: "H1, H2, or H3",
      },
      {
        type: "text",
        label: "Text Block",
        icon: <AlignLeft className="h-4 w-4" />,
        desc: "Paragraph of text",
      },
      {
        type: "bullet-list",
        label: "Bullet List",
        icon: <CheckSquare className="h-4 w-4" />,
        desc: "Unordered list",
      },
      {
        type: "numbered-list",
        label: "Numbered List",
        icon: <CheckSquare className="h-4 w-4" />,
        desc: "Ordered list",
      },
      {
        type: "quote",
        label: "Blockquote",
        icon: <Quote className="h-4 w-4" />,
        desc: "Highlighted quote",
      },
      {
        type: "code-block",
        label: "Code Block",
        icon: <Code className="h-4 w-4" />,
        desc: "Formatted code",
      },
      {
        type: "table",
        label: "Table",
        icon: <Table className="h-4 w-4" />,
        desc: "Data table",
      },
    ],
  },
  {
    category: "Media & Actions",
    blocks: [
      {
        type: "image",
        label: "Image",
        icon: <ImageIcon className="h-4 w-4" />,
        desc: "Photo or graphic",
      },
      {
        type: "button",
        label: "Button",
        icon: <Zap className="h-4 w-4" />,
        desc: "Call-to-action",
      },
      {
        type: "video-preview",
        label: "Video Thumbnail",
        icon: <Video className="h-4 w-4" />,
        desc: "Video link preview",
      },
      {
        type: "social",
        label: "Social Links",
        icon: <Share2 className="h-4 w-4" />,
        desc: "Social media links",
      },
    ],
  },
  {
    category: "Advanced",
    blocks: [
      {
        type: "feature-row",
        label: "Features Row",
        icon: <Star className="h-4 w-4" />,
        desc: "Icon + title + desc",
      },
      {
        type: "stats-row",
        label: "Stats Row",
        icon: <BarChart2 className="h-4 w-4" />,
        desc: "Numbers & metrics",
      },
      {
        type: "testimonial",
        label: "Testimonial",
        icon: <Quote className="h-4 w-4" />,
        desc: "Customer review",
      },
      {
        type: "product-card",
        label: "Product Card",
        icon: <Gift className="h-4 w-4" />,
        desc: "Product showcase",
      },
      {
        type: "countdown",
        label: "Countdown",
        icon: <Zap className="h-4 w-4" />,
        desc: "Urgency timer",
      },
      {
        type: "signature",
        label: "Signature",
        icon: <AtSign className="h-4 w-4" />,
        desc: "Email sign-off",
      },
    ],
  },
  {
    category: "Layout",
    blocks: [
      {
        type: "divider",
        label: "Divider",
        icon: <Minus className="h-4 w-4" />,
        desc: "Horizontal line",
      },
      {
        type: "spacer",
        label: "Spacer",
        icon: <ChevronDown className="h-4 w-4" />,
        desc: "Vertical gap",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK RENDERER (canvas preview — not the export HTML)
// ─────────────────────────────────────────────────────────────────────────────

function CanvasBlock({ block, gs }: { block: EmailBlock; gs: GlobalSettings }) {
  const style: React.CSSProperties = {
    fontFamily: gs.fontFamily,
    fontSize: gs.defaultFontSize,
    color: gs.defaultTextColor,
  };

  switch (block.type) {
    case "header": {
      const b = block as HeaderBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "16px 24px",
            textAlign: b.alignment,
          }}
        >
          {b.logoUrl ? (
            <img
              src={b.logoUrl}
              alt={b.brandName}
              style={{
                height: 36,
                maxWidth: b.logoWidth,
                objectFit: "contain",
                display: "inline-block",
              }}
            />
          ) : (
            <span
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: b.textColor,
                ...style,
              }}
            >
              {b.brandName}
            </span>
          )}
        </div>
      );
    }
    case "hero": {
      const b = block as HeroBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: `${b.paddingY}px 32px`,
            textAlign: b.alignment,
          }}
        >
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 26,
              fontWeight: 800,
              color: b.textColor,
              lineHeight: 1.2,
              ...style,
            }}
          >
            {b.heading}
          </h1>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              color: b.textColor,
              opacity: 0.85,
              lineHeight: 1.6,
              ...style,
            }}
          >
            {b.subtext}
          </p>
          {b.showButton && (
            <span
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: b.btnBg,
                color: b.btnTextColor,
                borderRadius: b.btnRadius,
                fontWeight: 700,
                fontSize: 14,
                ...style,
              }}
            >
              {b.btnLabel}
            </span>
          )}
        </div>
      );
    }
    case "text": {
      const b = block as TextBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: `${b.paddingY}px 24px`,
            fontSize: b.fontSize,
            color: b.color,
            textAlign: b.alignment,
            lineHeight: b.lineHeight,
            ...style,
          }}
        >
          {b.content.split("\n\n").map((p, i) => (
            <p key={i} style={{ margin: "0 0 10px" }}>
              {p}
            </p>
          ))}
        </div>
      );
    }
    case "heading": {
      const b = block as HeadingBlock;
      const sizes: Record<number, number> = { 1: 26, 2: 20, 3: 16 };
      const Tag = `h${b.level}` as "h1" | "h2" | "h3";
      return (
        <div style={{ background: b.bgColor, padding: `${b.paddingY}px 24px` }}>
          <Tag
            style={{
              margin: 0,
              fontSize: sizes[b.level],
              fontWeight: 700,
              color: b.color,
              textAlign: b.alignment,
              ...style,
            }}
          >
            {b.content}
          </Tag>
        </div>
      );
    }
    case "button": {
      const b = block as ButtonBlock;
      return (
        <div style={{ padding: "10px 24px", textAlign: b.alignment }}>
          <span
            style={{
              display: "inline-block",
              padding: `${b.paddingY}px ${b.paddingX}px`,
              background: b.bgColor,
              color: b.textColor,
              borderRadius: b.radius,
              fontWeight: 700,
              fontSize: b.fontSize,
              width: b.fullWidth ? "100%" : "auto",
              textAlign: "center",
              ...style,
            }}
          >
            {b.label}
          </span>
        </div>
      );
    }
    case "image": {
      const b = block as ImageBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "12px 24px",
            textAlign: b.alignment,
          }}
        >
          {b.src ? (
            <img
              src={b.src}
              alt={b.alt}
              style={{
                display: "inline-block",
                width: `${b.width}%`,
                maxWidth: "100%",
                borderRadius: b.borderRadius,
              }}
            />
          ) : (
            <div
              style={{
                background: "#f3f4f6",
                border: "2px dashed #d1d5db",
                borderRadius: b.borderRadius,
                padding: "24px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              📷 Add image URL in properties
            </div>
          )}
        </div>
      );
    }
    case "divider": {
      const b = block as DividerBlock;
      return (
        <div style={{ padding: `${b.marginY}px 24px` }}>
          <hr
            style={{
              border: "none",
              borderTop: `${b.thickness}px ${b.style} ${b.color}`,
              margin: 0,
            }}
          />
        </div>
      );
    }
    case "spacer": {
      const b = block as SpacerBlock;
      return (
        <div
          style={{
            height: b.height,
            background: b.bgColor || "transparent",
            fontSize: 0,
          }}
        >
          &nbsp;
        </div>
      );
    }
    case "two-column": {
      const b = block as TwoColumnBlock;
      const ratios: Record<string, [string, string]> = {
        "50-50": ["50%", "50%"],
        "60-40": ["60%", "40%"],
        "40-60": ["40%", "60%"],
        "70-30": ["70%", "30%"],
        "30-70": ["30%", "70%"],
      };
      const [lw, rw] = ratios[b.ratio] || ["50%", "50%"];
      return (
        <div style={{ background: b.bgColor, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: b.gap }}>
            <div
              style={{
                flex: lw,
                background: b.leftBg,
                padding: 12,
                fontSize: 13,
                color: "#374151",
                lineHeight: 1.5,
                borderRadius: 4,
                ...style,
              }}
            >
              {b.leftContent}
            </div>
            <div
              style={{
                flex: rw,
                background: b.rightBg,
                padding: 12,
                fontSize: 13,
                color: "#374151",
                lineHeight: 1.5,
                borderRadius: 4,
                ...style,
              }}
            >
              {b.rightContent}
            </div>
          </div>
        </div>
      );
    }
    case "three-column": {
      const b = block as ThreeColumnBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: b.gap }}>
            {[b.col1, b.col2, b.col3].map((c, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: 10,
                  fontSize: 12,
                  color: "#374151",
                  lineHeight: 1.5,
                  ...style,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "bullet-list": {
      const b = block as BulletListBlock;
      return (
        <div style={{ background: b.bgColor, padding: "8px 24px" }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {b.items.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 6,
                  fontSize: b.fontSize,
                  color: b.color,
                  lineHeight: b.lineHeight,
                  ...style,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "numbered-list": {
      const b = block as NumberedListBlock;
      return (
        <div style={{ background: b.bgColor, padding: "8px 24px" }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {b.items.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 6,
                  fontSize: b.fontSize,
                  color: b.color,
                  lineHeight: 1.6,
                  ...style,
                }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "quote": {
      const b = block as QuoteBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "20px 24px",
            borderLeft: `4px solid ${b.borderColor}`,
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: b.fontSize,
              color: b.textColor,
              fontStyle: "italic",
              lineHeight: 1.6,
              ...style,
            }}
          >
            {b.content}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: b.textColor,
              opacity: 0.7,
              fontWeight: 600,
              ...style,
            }}
          >
            {b.author}
          </p>
        </div>
      );
    }
    case "social": {
      const b = block as SocialBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "16px 24px",
            textAlign: b.alignment,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent:
                b.alignment === "center"
                  ? "center"
                  : b.alignment === "right"
                    ? "flex-end"
                    : "flex-start",
              flexWrap: "wrap",
            }}
          >
            {b.links.map((l, i) => (
              <span
                key={i}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: b.iconColor,
                  padding: "6px 12px",
                  background: "rgba(0,0,0,0.05)",
                  borderRadius: 6,
                  ...style,
                }}
              >
                {b.showLabels ? l.label : l.platform}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case "footer": {
      const b = block as FooterBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            borderTop: "1px solid #e5e7eb",
            padding: "20px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 600,
              color: b.textColor,
              ...style,
            }}
          >
            {b.companyName}
          </p>
          {b.showAddress && (
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                color: b.textColor,
                ...style,
              }}
            >
              {b.address}
            </p>
          )}
          {b.showUnsubscribe && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: b.textColor,
                ...style,
              }}
            >
              <u>{b.unsubscribeText}</u>
            </p>
          )}
        </div>
      );
    }
    case "feature-row": {
      const b = block as FeatureRowBlock;
      return (
        <div style={{ background: b.bgColor, padding: "24px 16px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {b.features.map((f, i) => (
              <div
                key={i}
                style={{ flex: 1, textAlign: "center", padding: "12px 8px" }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: b.textColor,
                    ...style,
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: b.textColor,
                    opacity: 0.7,
                    lineHeight: 1.4,
                    ...style,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "stats-row": {
      const b = block as StatsRowBlock;
      return (
        <div style={{ background: b.bgColor, padding: "20px 16px" }}>
          <div style={{ display: "flex" }}>
            {b.stats.map((s, i) => (
              <div
                key={i}
                style={{ flex: 1, textAlign: "center", padding: "16px 8px" }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 28,
                    fontWeight: 800,
                    color: b.valueColor,
                    ...style,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: b.labelColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    ...style,
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "testimonial": {
      const b = block as TestimonialBlock;
      return (
        <div style={{ background: b.bgColor, padding: "24px 24px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 32, color: b.accentColor }}>
            "
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              color: b.textColor,
              fontStyle: "italic",
              lineHeight: 1.6,
              ...style,
            }}
          >
            {b.quote}
          </p>
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 13,
              fontWeight: 700,
              color: b.textColor,
              ...style,
            }}
          >
            {b.author}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: b.textColor,
              opacity: 0.65,
              ...style,
            }}
          >
            {b.role}
          </p>
        </div>
      );
    }
    case "code-block": {
      const b = block as CodeBlockBlock;
      return (
        <div style={{ padding: "12px 24px" }}>
          <pre
            style={{
              margin: 0,
              padding: 16,
              background: b.bgColor,
              color: b.textColor,
              borderRadius: 8,
              fontFamily: "Courier New,monospace",
              fontSize: 12,
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            {b.code}
          </pre>
        </div>
      );
    }
    case "video-preview": {
      const b = block as VideoPreviewBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 24px" }}>
          {b.thumbnailUrl ? (
            <img
              src={b.thumbnailUrl}
              alt="Video"
              style={{ width: "100%", borderRadius: 8, display: "block" }}
            />
          ) : (
            <div
              style={{
                background: "#1e293b",
                borderRadius: 8,
                padding: "32px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 40 }}>▶</div>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#94a3b8",
                  fontSize: 13,
                  ...style,
                }}
              >
                {b.title}
              </p>
            </div>
          )}
        </div>
      );
    }
    case "product-card": {
      const b = block as ProductCardBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 24px" }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {b.imageUrl ? (
              <img
                src={b.imageUrl}
                alt={b.name}
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  height: 100,
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                📦 Add image URL
              </div>
            )}
            <div style={{ padding: 16 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                  ...style,
                }}
              >
                {b.name}
              </p>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  color: "#6b7280",
                  ...style,
                }}
              >
                {b.description}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}
                >
                  {b.price}
                </span>
                {b.originalPrice && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      textDecoration: "line-through",
                    }}
                  >
                    {b.originalPrice}
                  </span>
                )}
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: b.btnBg,
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  ...style,
                }}
              >
                {b.btnLabel}
              </span>
            </div>
          </div>
        </div>
      );
    }
    case "countdown": {
      const b = block as CountdownBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              fontWeight: 600,
              color: b.textColor,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              ...style,
            }}
          >
            {b.label}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {["DD", "HH", "MM", "SS"].map((u, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    background: b.numberBg,
                    borderRadius: 8,
                    padding: "10px 16px",
                    minWidth: 52,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 800,
                      color: b.numberColor,
                      ...style,
                    }}
                  >
                    {u}
                  </p>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 10,
                    color: b.textColor,
                    ...style,
                  }}
                >
                  {["Days", "Hrs", "Min", "Sec"][i]}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "signature": {
      const b = block as SignatureBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            borderTop: `2px solid ${b.accentColor}`,
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 15,
              fontWeight: 700,
              color: b.textColor,
              ...style,
            }}
          >
            {b.name}
          </p>
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 12,
              color: b.textColor,
              opacity: 0.7,
              ...style,
            }}
          >
            {b.title} · {b.company}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: b.accentColor,
              ...style,
            }}
          >
            {b.email} · {b.phone}
          </p>
        </div>
      );
    }
    case "table": {
      const b = block as TableBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 24px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: `1px solid ${b.borderColor}`,
              borderRadius: 8,
              overflow: "hidden",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px 10px",
                      background: b.headerBg,
                      color: b.headerColor,
                      textAlign: "left",
                      fontWeight: 600,
                      ...style,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    background:
                      b.stripedRows && ri % 2 === 1 ? "#f9fafb" : b.bgColor,
                  }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "7px 10px",
                        borderBottom: `1px solid ${b.borderColor}`,
                        color: "#374151",
                        ...style,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return (
        <div style={{ padding: 12, color: "#9ca3af", fontSize: 12 }}>
          Block preview
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES PANEL (right sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 font-mono"
        />
      </div>
    </div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        <span className="text-xs font-mono text-gray-600">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-600"
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

function AlignButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "left" | "center" | "right") => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">Alignment</label>
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className={`flex-1 py-1.5 rounded text-xs font-medium border ${value === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {a === "left" ? (
              <AlignLeft className="h-3.5 w-3.5 mx-auto" />
            ) : a === "center" ? (
              <AlignCenter className="h-3.5 w-3.5 mx-auto" />
            ) : (
              <AlignRight className="h-3.5 w-3.5 mx-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function VariableInsertButtons({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">
        Insert Variable
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-medium text-blue-700"
        >
          <Braces className="h-3 w-3" /> Insert Variable
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                onClick={() => {
                  onInsert(v.token);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-medium text-gray-700">{v.label}</span>
                <code className="text-gray-400 font-mono">{v.token}</code>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertiesPanel({
  block,
  onChange,
  gs,
  onGsChange,
}: {
  block: EmailBlock | null;
  onChange: (updated: EmailBlock) => void;
  gs: GlobalSettings;
  onGsChange: (updated: GlobalSettings) => void;
}) {
  if (!block) {
    // Global settings panel
    return (
      <div className="p-4 space-y-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Global Settings
        </h3>
        <div className="space-y-4">
          <ColorInput
            label="Email Background"
            value={gs.emailBgColor}
            onChange={(v) => onGsChange({ ...gs, emailBgColor: v })}
          />
          <ColorInput
            label="Content Background"
            value={gs.contentBgColor}
            onChange={(v) => onGsChange({ ...gs, contentBgColor: v })}
          />
          <SliderInput
            label="Content Width"
            value={gs.contentWidth}
            onChange={(v) => onGsChange({ ...gs, contentWidth: v })}
            min={480}
            max={700}
            step={10}
            unit="px"
          />
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">
              Font Family
            </label>
            <select
              value={gs.fontFamily}
              onChange={(e) =>
                onGsChange({ ...gs, fontFamily: e.target.value })
              }
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
            >
              {[
                "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                "Georgia,serif",
                "'Times New Roman',serif",
                "Arial,sans-serif",
                "Verdana,sans-serif",
                "'Trebuchet MS',sans-serif",
                "Helvetica,sans-serif",
              ].map((f) => (
                <option key={f} value={f}>
                  {f.split(",")[0].replace(/'/g, "")}
                </option>
              ))}
            </select>
          </div>
          <ColorInput
            label="Default Text Color"
            value={gs.defaultTextColor}
            onChange={(v) => onGsChange({ ...gs, defaultTextColor: v })}
          />
          <SliderInput
            label="Default Font Size"
            value={gs.defaultFontSize}
            onChange={(v) => onGsChange({ ...gs, defaultFontSize: v })}
            min={12}
            max={20}
            unit="px"
          />
        </div>
      </div>
    );
  }

  const update = (changes: Partial<EmailBlock>) =>
    onChange({ ...block, ...changes } as EmailBlock);

  // Per-block properties
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider capitalize">
        {block.type.replace(/-/g, " ")} Settings
      </h3>

      {block.type === "header" &&
        (() => {
          const b = block as HeaderBlock;
          return (
            <>
              <TextInput
                label="Brand Name"
                value={b.brandName}
                onChange={(v) => update({ brandName: v })}
              />
              <TextInput
                label="Logo URL (optional)"
                value={b.logoUrl}
                onChange={(v) => update({ logoUrl: v })}
                placeholder="https://..."
              />
              <SliderInput
                label="Logo Width"
                value={b.logoWidth}
                onChange={(v) => update({ logoWidth: v })}
                min={60}
                max={260}
                unit="px"
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text / Logo Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {block.type === "hero" &&
        (() => {
          const b = block as HeroBlock;
          return (
            <>
              <TextInput
                label="Heading"
                value={b.heading}
                onChange={(v) => update({ heading: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ heading: b.heading + t })}
              />
              <TextInput
                label="Subtext"
                value={b.subtext}
                onChange={(v) => update({ subtext: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ subtext: b.subtext + t })}
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={16}
                max={96}
                unit="px"
              />
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={b.showButton}
                    onChange={(e) => update({ showButton: e.target.checked })}
                    className="rounded"
                  />
                  Show CTA Button
                </label>
              </div>
              {b.showButton && (
                <>
                  <TextInput
                    label="Button Label"
                    value={b.btnLabel}
                    onChange={(v) => update({ btnLabel: v })}
                  />
                  <TextInput
                    label="Button URL"
                    value={b.btnUrl}
                    onChange={(v) => update({ btnUrl: v })}
                  />
                  <ColorInput
                    label="Button Background"
                    value={b.btnBg}
                    onChange={(v) => update({ btnBg: v })}
                  />
                  <ColorInput
                    label="Button Text"
                    value={b.btnTextColor}
                    onChange={(v) => update({ btnTextColor: v })}
                  />
                  <SliderInput
                    label="Border Radius"
                    value={b.btnRadius}
                    onChange={(v) => update({ btnRadius: v })}
                    min={0}
                    max={40}
                    unit="px"
                  />
                </>
              )}
            </>
          );
        })()}

      {block.type === "text" &&
        (() => {
          const b = block as TextBlock;
          return (
            <>
              <TextInput
                label="Content"
                value={b.content}
                onChange={(v) => update({ content: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={11}
                max={26}
                unit="px"
              />
              <SliderInput
                label="Line Height"
                value={b.lineHeight}
                onChange={(v) => update({ lineHeight: v })}
                min={1.0}
                max={3.0}
                step={0.1}
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={0}
                max={64}
                unit="px"
              />
            </>
          );
        })()}

      {block.type === "heading" &&
        (() => {
          const b = block as HeadingBlock;
          return (
            <>
              <TextInput
                label="Heading Text"
                value={b.content}
                onChange={(v) => update({ content: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Heading Level
                </label>
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => update({ level: l })}
                      className={`flex-1 py-1.5 rounded text-xs font-bold border ${b.level === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                    >
                      H{l}
                    </button>
                  ))}
                </div>
              </div>
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {block.type === "button" &&
        (() => {
          const b = block as ButtonBlock;
          return (
            <>
              <TextInput
                label="Button Label"
                value={b.label}
                onChange={(v) => update({ label: v })}
              />
              <TextInput
                label="URL"
                value={b.url}
                onChange={(v) => update({ url: v })}
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={12}
                max={22}
                unit="px"
              />
              <SliderInput
                label="Border Radius"
                value={b.radius}
                onChange={(v) => update({ radius: v })}
                min={0}
                max={40}
                unit="px"
              />
              <SliderInput
                label="Padding X"
                value={b.paddingX}
                onChange={(v) => update({ paddingX: v })}
                min={8}
                max={64}
                unit="px"
              />
              <SliderInput
                label="Padding Y"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={6}
                max={32}
                unit="px"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.fullWidth}
                  onChange={(e) => update({ fullWidth: e.target.checked })}
                  className="rounded"
                />
                Full Width Button
              </label>
            </>
          );
        })()}

      {block.type === "image" &&
        (() => {
          const b = block as ImageBlock;
          return (
            <>
              <TextInput
                label="Image URL"
                value={b.src}
                onChange={(v) => update({ src: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Alt Text"
                value={b.alt}
                onChange={(v) => update({ alt: v })}
              />
              <TextInput
                label="Link URL (optional)"
                value={b.linkUrl}
                onChange={(v) => update({ linkUrl: v })}
                placeholder="https://..."
              />
              <SliderInput
                label="Width"
                value={b.width}
                onChange={(v) => update({ width: v })}
                min={20}
                max={100}
                unit="%"
              />
              <SliderInput
                label="Border Radius"
                value={b.borderRadius}
                onChange={(v) => update({ borderRadius: v })}
                min={0}
                max={40}
                unit="px"
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "divider" &&
        (() => {
          const b = block as DividerBlock;
          return (
            <>
              <ColorInput
                label="Line Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <SliderInput
                label="Thickness"
                value={b.thickness}
                onChange={(v) => update({ thickness: v })}
                min={1}
                max={8}
                unit="px"
              />
              <SliderInput
                label="Margin (top/bottom)"
                value={b.marginY}
                onChange={(v) => update({ marginY: v })}
                min={4}
                max={64}
                unit="px"
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Line Style
                </label>
                <div className="flex gap-1">
                  {(["solid", "dashed", "dotted"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => update({ style: s })}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border ${b.style === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      {block.type === "spacer" &&
        (() => {
          const b = block as SpacerBlock;
          return (
            <>
              <SliderInput
                label="Height"
                value={b.height}
                onChange={(v) => update({ height: v })}
                min={8}
                max={120}
                unit="px"
              />
              <ColorInput
                label="Background"
                value={b.bgColor || "transparent"}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "two-column" &&
        (() => {
          const b = block as TwoColumnBlock;
          return (
            <>
              <TextInput
                label="Left Column Content"
                value={b.leftContent}
                onChange={(v) => update({ leftContent: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ leftContent: b.leftContent + t })}
              />
              <TextInput
                label="Right Column Content"
                value={b.rightContent}
                onChange={(v) => update({ rightContent: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ rightContent: b.rightContent + t })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Column Ratio
                </label>
                <select
                  value={b.ratio}
                  onChange={(e) => update({ ratio: e.target.value as any })}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  {["50-50", "60-40", "40-60", "70-30", "30-70"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Left Column Background"
                value={b.leftBg}
                onChange={(v) => update({ leftBg: v })}
              />
              <ColorInput
                label="Right Column Background"
                value={b.rightBg}
                onChange={(v) => update({ rightBg: v })}
              />
              <SliderInput
                label="Gap"
                value={b.gap}
                onChange={(v) => update({ gap: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {block.type === "three-column" &&
        (() => {
          const b = block as ThreeColumnBlock;
          return (
            <>
              <TextInput
                label="Column 1"
                value={b.col1}
                onChange={(v) => update({ col1: v })}
                multiline
              />
              <TextInput
                label="Column 2"
                value={b.col2}
                onChange={(v) => update({ col2: v })}
                multiline
              />
              <TextInput
                label="Column 3"
                value={b.col3}
                onChange={(v) => update({ col3: v })}
                multiline
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Gap"
                value={b.gap}
                onChange={(v) => update({ gap: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {block.type === "bullet-list" &&
        (() => {
          const b = block as BulletListBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  List Items
                </label>
                {b.items.map((item, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const items = [...b.items];
                        items[i] = e.target.value;
                        update({ items });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                    />
                    <button
                      onClick={() =>
                        update({ items: b.items.filter((_, j) => j !== i) })
                      }
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update({ items: [...b.items, "New item"] })}
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add item
                </button>
              </div>
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={11}
                max={22}
                unit="px"
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Bullet Color"
                value={b.bulletColor}
                onChange={(v) => update({ bulletColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "numbered-list" &&
        (() => {
          const b = block as NumberedListBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  List Items
                </label>
                {b.items.map((item, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const items = [...b.items];
                        items[i] = e.target.value;
                        update({ items });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                    />
                    <button
                      onClick={() =>
                        update({ items: b.items.filter((_, j) => j !== i) })
                      }
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update({ items: [...b.items, "New step"] })}
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add item
                </button>
              </div>
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Number Color"
                value={b.numberColor}
                onChange={(v) => update({ numberColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "quote" &&
        (() => {
          const b = block as QuoteBlock;
          return (
            <>
              <TextInput
                label="Quote Text"
                value={b.content}
                onChange={(v) => update({ content: v })}
                multiline
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <TextInput
                label="Author"
                value={b.author}
                onChange={(v) => update({ author: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={12}
                max={24}
                unit="px"
              />
              <ColorInput
                label="Border Accent"
                value={b.borderColor}
                onChange={(v) => update({ borderColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {block.type === "social" &&
        (() => {
          const b = block as SocialBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Social Links
                </label>
                {b.links.map((l, i) => (
                  <div
                    key={i}
                    className="space-y-1 border border-gray-100 rounded p-2"
                  >
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Platform"
                        value={l.platform}
                        onChange={(e) => {
                          const links = [...b.links];
                          links[i] = { ...l, platform: e.target.value };
                          update({ links });
                        }}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                      />
                      <button
                        onClick={() =>
                          update({ links: b.links.filter((_, j) => j !== i) })
                        }
                        className="text-red-400 hover:text-red-600 px-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={l.url}
                      onChange={(e) => {
                        const links = [...b.links];
                        links[i] = { ...l, url: e.target.value };
                        update({ links });
                      }}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({
                      links: [
                        ...b.links,
                        { platform: "Platform", url: "#", label: "Platform" },
                      ],
                    })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add link
                </button>
              </div>
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Text/Icon Color"
                value={b.iconColor}
                onChange={(v) => update({ iconColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showLabels}
                  onChange={(e) => update({ showLabels: e.target.checked })}
                  className="rounded"
                />
                Show Labels
              </label>
            </>
          );
        })()}

      {block.type === "footer" &&
        (() => {
          const b = block as FooterBlock;
          return (
            <>
              <TextInput
                label="Company Name"
                value={b.companyName}
                onChange={(v) => update({ companyName: v })}
              />
              <TextInput
                label="Address"
                value={b.address}
                onChange={(v) => update({ address: v })}
              />
              <TextInput
                label="Unsubscribe Text"
                value={b.unsubscribeText}
                onChange={(v) => update({ unsubscribeText: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showUnsubscribe}
                  onChange={(e) =>
                    update({ showUnsubscribe: e.target.checked })
                  }
                  className="rounded"
                />
                Show Unsubscribe Link
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showAddress}
                  onChange={(e) => update({ showAddress: e.target.checked })}
                  className="rounded"
                />
                Show Address
              </label>
            </>
          );
        })()}

      {block.type === "feature-row" &&
        (() => {
          const b = block as FeatureRowBlock;
          return (
            <>
              {b.features.map((f, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded p-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Feature {i + 1}
                    </span>
                    <button
                      onClick={() =>
                        update({
                          features: b.features.filter((_, j) => j !== i),
                        })
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Emoji icon"
                    value={f.icon}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, icon: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={f.title}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, title: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={f.desc}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, desc: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  update({
                    features: [
                      ...b.features,
                      {
                        icon: "✨",
                        title: "New Feature",
                        desc: "Describe this feature.",
                      },
                    ],
                  })
                }
                className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
              >
                + Add Feature
              </button>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {block.type === "stats-row" &&
        (() => {
          const b = block as StatsRowBlock;
          return (
            <>
              {b.stats.map((s, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => {
                      const st = [...b.stats];
                      st[i] = { ...s, value: e.target.value };
                      update({ stats: st });
                    }}
                    className="w-24 text-xs border border-gray-200 rounded px-2 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={s.label}
                    onChange={(e) => {
                      const st = [...b.stats];
                      st[i] = { ...s, label: e.target.value };
                      update({ stats: st });
                    }}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                  />
                  <button
                    onClick={() =>
                      update({ stats: b.stats.filter((_, j) => j !== i) })
                    }
                    className="text-red-400 hover:text-red-600 px-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  update({
                    stats: [...b.stats, { value: "0", label: "New Stat" }],
                  })
                }
                className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
              >
                + Add Stat
              </button>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Value Color"
                value={b.valueColor}
                onChange={(v) => update({ valueColor: v })}
              />
              <ColorInput
                label="Label Color"
                value={b.labelColor}
                onChange={(v) => update({ labelColor: v })}
              />
            </>
          );
        })()}

      {block.type === "testimonial" &&
        (() => {
          const b = block as TestimonialBlock;
          return (
            <>
              <TextInput
                label="Quote"
                value={b.quote}
                onChange={(v) => update({ quote: v })}
                multiline
              />
              <TextInput
                label="Author Name"
                value={b.author}
                onChange={(v) => update({ author: v })}
              />
              <TextInput
                label="Role / Company"
                value={b.role}
                onChange={(v) => update({ role: v })}
              />
              <ColorInput
                label="Accent Color"
                value={b.accentColor}
                onChange={(v) => update({ accentColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {block.type === "product-card" &&
        (() => {
          const b = block as ProductCardBlock;
          return (
            <>
              <TextInput
                label="Image URL"
                value={b.imageUrl}
                onChange={(v) => update({ imageUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Product Name"
                value={b.name}
                onChange={(v) => update({ name: v })}
              />
              <TextInput
                label="Description"
                value={b.description}
                onChange={(v) => update({ description: v })}
                multiline
              />
              <TextInput
                label="Price"
                value={b.price}
                onChange={(v) => update({ price: v })}
              />
              <TextInput
                label="Original Price (for strikethrough)"
                value={b.originalPrice}
                onChange={(v) => update({ originalPrice: v })}
              />
              <TextInput
                label="Button Label"
                value={b.btnLabel}
                onChange={(v) => update({ btnLabel: v })}
              />
              <TextInput
                label="Button URL"
                value={b.btnUrl}
                onChange={(v) => update({ btnUrl: v })}
              />
              <ColorInput
                label="Button Color"
                value={b.btnBg}
                onChange={(v) => update({ btnBg: v })}
              />
              <ColorInput
                label="Card Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "countdown" &&
        (() => {
          const b = block as CountdownBlock;
          return (
            <>
              <TextInput
                label="Label Text"
                value={b.label}
                onChange={(v) => update({ label: v })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Target Date
                </label>
                <input
                  type="date"
                  value={b.targetDate}
                  onChange={(e) => update({ targetDate: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                />
              </div>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Label Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <ColorInput
                label="Number Box Background"
                value={b.numberBg}
                onChange={(v) => update({ numberBg: v })}
              />
              <ColorInput
                label="Number Color"
                value={b.numberColor}
                onChange={(v) => update({ numberColor: v })}
              />
            </>
          );
        })()}

      {block.type === "signature" &&
        (() => {
          const b = block as SignatureBlock;
          return (
            <>
              <TextInput
                label="Name"
                value={b.name}
                onChange={(v) => update({ name: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ name: b.name + t })}
              />
              <TextInput
                label="Title"
                value={b.title}
                onChange={(v) => update({ title: v })}
              />
              <TextInput
                label="Company"
                value={b.company}
                onChange={(v) => update({ company: v })}
              />
              <TextInput
                label="Email"
                value={b.email}
                onChange={(v) => update({ email: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ email: b.email + t })}
              />
              <TextInput
                label="Phone"
                value={b.phone}
                onChange={(v) => update({ phone: v })}
              />
              <ColorInput
                label="Accent Color"
                value={b.accentColor}
                onChange={(v) => update({ accentColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {block.type === "table" &&
        (() => {
          const b = block as TableBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Column Headers
                </label>
                {b.headers.map((h, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => {
                        const headers = [...b.headers];
                        headers[i] = e.target.value;
                        update({
                          headers,
                          rows: b.rows.map((r) => {
                            const row = [...r];
                            if (row.length < headers.length) row.push("");
                            return row;
                          }),
                        });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 font-semibold"
                    />
                    <button
                      onClick={() => {
                        const headers = b.headers.filter((_, j) => j !== i);
                        update({
                          headers,
                          rows: b.rows.map((r) => r.filter((_, j) => j !== i)),
                        });
                      }}
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({
                      headers: [...b.headers, `Col ${b.headers.length + 1}`],
                      rows: b.rows.map((r) => [...r, ""]),
                    })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add Column
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Rows
                </label>
                {b.rows.map((row, ri) => (
                  <div key={ri} className="flex gap-1 items-start">
                    <div
                      className="flex-1 grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${b.headers.length},1fr)`,
                      }}
                    >
                      {b.headers.map((_, ci) => (
                        <input
                          key={ci}
                          type="text"
                          value={row[ci] || ""}
                          onChange={(e) => {
                            const rows = b.rows.map((r, i) =>
                              i === ri
                                ? r.map((c, j) =>
                                    j === ci ? e.target.value : c,
                                  )
                                : r,
                            );
                            update({ rows });
                          }}
                          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                        />
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        update({ rows: b.rows.filter((_, j) => j !== ri) })
                      }
                      className="text-red-400 hover:text-red-600 mt-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({ rows: [...b.rows, b.headers.map(() => "")] })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add Row
                </button>
              </div>
              <ColorInput
                label="Header Background"
                value={b.headerBg}
                onChange={(v) => update({ headerBg: v })}
              />
              <ColorInput
                label="Header Text"
                value={b.headerColor}
                onChange={(v) => update({ headerColor: v })}
              />
              <ColorInput
                label="Border Color"
                value={b.borderColor}
                onChange={(v) => update({ borderColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.stripedRows}
                  onChange={(e) => update({ stripedRows: e.target.checked })}
                  className="rounded"
                />
                Striped Rows
              </label>
            </>
          );
        })()}

      {block.type === "video-preview" &&
        (() => {
          const b = block as VideoPreviewBlock;
          return (
            <>
              <TextInput
                label="Video URL"
                value={b.videoUrl}
                onChange={(v) => update({ videoUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Thumbnail Image URL"
                value={b.thumbnailUrl}
                onChange={(v) => update({ thumbnailUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Caption / Title"
                value={b.title}
                onChange={(v) => update({ title: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {block.type === "code-block" &&
        (() => {
          const b = block as CodeBlockBlock;
          return (
            <>
              <TextInput
                label="Code"
                value={b.code}
                onChange={(v) => update({ code: v })}
                multiline
              />
              <TextInput
                label="Language (label only)"
                value={b.language}
                onChange={(v) => update({ language: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  html,
}: {
  open: boolean;
  onClose: () => void;
  html: string;
}) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Email Preview</h2>
          <p className="text-xs text-gray-500">Accurate inbox rendering</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "desktop" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              onClick={() => setMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "mobile" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-8 flex justify-center">
        <div
          className="transition-all duration-300"
          style={{
            width: mode === "mobile" ? 390 : "100%",
            maxWidth: mode === "mobile" ? 390 : 720,
          }}
        >
          {mode === "mobile" && (
            <div className="relative bg-gray-900 rounded-[2.5rem] p-3 pb-4 shadow-2xl">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
              <div className="bg-white rounded-[2rem] overflow-hidden mt-3">
                <iframe
                  srcDoc={html}
                  title="Email preview"
                  className="w-full border-0 block"
                  style={{ height: 600 }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
          {mode === "desktop" && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Fake browser chrome */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${c}`}
                      />
                    ),
                  )}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-0.5 text-xs text-gray-400">
                  Email Preview
                </div>
              </div>
              <iframe
                srcDoc={html}
                title="Email preview"
                className="w-full border-0 block"
                style={{ height: 700 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface VisualEmailBuilderProps {
  initialBlocks?: EmailBlock[];
  initialHtml?: string;
  templateName?: string;
  onSave: (html: string, designJson: string, name: string) => void;
  onBack: () => void;
  isSaving?: boolean;
}

const DEFAULT_GS: GlobalSettings = {
  emailBgColor: "#f3f4f6",
  contentWidth: 600,
  contentBgColor: "#ffffff",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  defaultTextColor: "black",
  defaultFontSize: 15,
};

export default function VisualEmailBuilder({
  initialBlocks,
  initialHtml,
  templateName = "Untitled Template",
  onSave,
  onBack,
  isSaving = false,
}: VisualEmailBuilderProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks || []);
  const [gs, setGs] = useState<GlobalSettings>(DEFAULT_GS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState(templateName);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggingOver, setDraggingOver] = useState<number | null>(null);
  const [draggingBlockIdx, setDraggingBlockIdx] = useState<number | null>(null);
  const [leftTab, setLeftTab] = useState<"blocks" | "variables">("blocks");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const addBlock = useCallback((type: BlockType, insertAt?: number) => {
    const block = defaultBlock(type);
    setBlocks((prev) => {
      if (insertAt !== undefined) {
        const next = [...prev];
        next.splice(insertAt + 1, 0, block);
        return next;
      }
      return [...prev, block];
    });
    setSelectedId(block.id);
    setTimeout(() => {
      const el = document.getElementById(`block-${block.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  const updateBlock = useCallback((updated: EmailBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }, []);

  const duplicateBlock = useCallback(
    (id: string) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const clone = { ...blocks[idx], id: makeId() };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, clone as EmailBlock);
        return next;
      });
      setSelectedId(clone.id);
    },
    [blocks],
  );

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  // Drag-and-drop from sidebar
  const handleSidebarDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("blockType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDraggingOver(idx);
  };

  const handleCanvasDrop = (e: React.DragEvent, insertIdx: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("blockType") as BlockType;
    if (type) addBlock(type, insertIdx);
    setDraggingOver(null);
  };

  // Canvas block reorder drag
  const handleBlockDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("reorderIdx", String(idx));
    setDraggingBlockIdx(idx);
  };

  const handleBlockReorderDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData("reorderIdx"));
    if (isNaN(fromIdx) || fromIdx === targetIdx) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDraggingBlockIdx(null);
    setDraggingOver(null);
  };

  const handleSave = () => {
    const html = buildEmailHtml(blocks, gs);
    const designJson: DesignJson = { blocks, globalSettings: gs, version: 1 };
    onSave(html, JSON.stringify(designJson), name);
  };

  const filteredCatalogue = BLOCK_CATALOGUE.map((cat) => ({
    ...cat,
    blocks: cat.blocks.filter(
      (b) =>
        !sidebarSearch ||
        b.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        b.desc.toLowerCase().includes(sidebarSearch.toLowerCase()),
    ),
  })).filter((cat) => cat.blocks.length > 0);

  const previewHtml = previewOpen ? buildEmailHtml(blocks, gs) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-50"
      style={{ fontFamily: "system-ui,sans-serif" }}
    >
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <LayoutTemplate className="h-4 w-4 text-blue-600" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm font-semibold text-gray-900 border-none outline-none bg-transparent focus:bg-gray-50 rounded px-2 py-1 min-w-[200px]"
            placeholder="Template name..."
          />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={blocks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || blocks.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Template
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(["blocks", "variables"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${leftTab === tab ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {leftTab === "blocks" && (
            <>
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search blocks..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {filteredCatalogue.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      {cat.category}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {cat.blocks.map((b) => (
                        <div
                          key={b.type}
                          draggable
                          onDragStart={(e) => handleSidebarDragStart(e, b.type)}
                          onClick={() => addBlock(b.type)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all group text-center"
                          title={b.desc}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                            {b.icon}
                          </div>
                          <span className="text-[10px] font-medium text-gray-600 group-hover:text-blue-700 leading-tight">
                            {b.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {leftTab === "variables" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                Click a variable to copy it, then paste it into any text field.
                These are replaced with each contact's real data at send time.
              </p>
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  onClick={() => {
                    navigator.clipboard?.writeText(v.token);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700">
                      {v.label}
                    </span>
                    <Copy className="h-3 w-3 text-gray-300 group-hover:text-blue-500" />
                  </div>
                  <code className="text-[11px] text-blue-600 font-mono">
                    {v.token}
                  </code>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    e.g. {v.example}
                  </p>
                </button>
              ))}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[11px] text-amber-700 font-medium mb-1">
                  💡 How to use
                </p>
                <p className="text-[11px] text-amber-600">
                  Copy a token and paste it anywhere in a text field in the
                  Properties panel. Each recipient will see their own data when
                  the email is sent.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── CANVAS ───────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-y-auto bg-gray-100"
          onClick={(e) => {
            if (
              e.target === canvasRef.current ||
              (e.target as HTMLElement).classList.contains("canvas-bg")
            )
              setSelectedId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData("blockType") as BlockType;
            if (type && blocks.length === 0) addBlock(type);
          }}
        >
          <div className="max-w-[700px] mx-auto py-8 px-4">
            {/* Email container */}
            <div
              className="shadow-xl rounded-xl overflow-hidden"
              style={{ background: gs.emailBgColor }}
            >
              <div
                style={{
                  maxWidth: gs.contentWidth,
                  margin: "0 auto",
                  background: gs.contentBgColor,
                }}
              >
                {blocks.length === 0 && (
                  <div
                    className="canvas-bg flex flex-col items-center justify-center py-24 text-center"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingOver(-1);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const type = e.dataTransfer.getData(
                        "blockType",
                      ) as BlockType;
                      if (type) addBlock(type);
                      setDraggingOver(null);
                    }}
                  >
                    <div
                      className={`w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 transition-colors ${draggingOver !== null ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
                    >
                      <Plus
                        className={`h-7 w-7 ${draggingOver !== null ? "text-blue-400" : "text-gray-300"}`}
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">
                      Drag blocks here or click from the sidebar
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Start building your email template
                    </p>
                    <div className="flex gap-2 mt-6 flex-wrap justify-center">
                      {[
                        { type: "header" as BlockType, label: "Header" },
                        { type: "hero" as BlockType, label: "Hero" },
                        { type: "text" as BlockType, label: "Text" },
                        { type: "footer" as BlockType, label: "Footer" },
                      ].map((b) => (
                        <button
                          key={b.type}
                          onClick={() => addBlock(b.type)}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                        >
                          + {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {blocks.map((block, idx) => {
                  const isSelected = selectedId === block.id;
                  return (
                    <div key={block.id} id={`block-${block.id}`}>
                      {/* Drop zone above block */}
                      <div
                        className={`transition-all duration-150 ${draggingOver === idx - 1 ? "h-3 bg-blue-100 border-2 border-dashed border-blue-400 rounded" : "h-1"}`}
                        onDragOver={(e) => handleCanvasDragOver(e, idx - 1)}
                        onDrop={(e) => handleCanvasDrop(e, idx - 1)}
                        onDragLeave={() => setDraggingOver(null)}
                      />

                      {/* Block wrapper */}
                      <div
                        className={`relative group cursor-pointer transition-all duration-100 ${isSelected ? "ring-2 ring-blue-500 ring-offset-0" : "hover:ring-1 hover:ring-blue-300"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(block.id);
                        }}
                        draggable
                        onDragStart={(e) => handleBlockDragStart(e, idx)}
                        onDragOver={(e) => handleCanvasDragOver(e, idx)}
                        onDrop={(e) => handleBlockReorderDrop(e, idx)}
                      >
                        {/* Selection label */}
                        {isSelected && (
                          <div className="absolute -top-5 left-0 z-10 flex items-center gap-1">
                            <span className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-t capitalize">
                              {block.type.replace(/-/g, " ")}
                            </span>
                          </div>
                        )}

                        {/* Block controls (visible on hover/select) */}
                        <div
                          className={`absolute right-1 top-1 z-10 flex items-center gap-0.5 transition-opacity ${isSelected || true ? "opacity-0 group-hover:opacity-100" : "opacity-0"}`}
                        >
                          <div className="flex bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveBlock(block.id, -1);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Move up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveBlock(block.id, 1);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Move down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px bg-gray-200" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateBlock(block.id);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px bg-gray-200" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBlock(block.id);
                              }}
                              className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div
                            className="bg-white border border-gray-200 rounded-lg shadow-md p-1.5 cursor-grab ml-0.5"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </div>

                        {/* Block content */}
                        <CanvasBlock block={block} gs={gs} />
                      </div>

                      {/* Drop zone after last block */}
                      {idx === blocks.length - 1 && (
                        <div
                          className={`transition-all duration-150 ${draggingOver === idx ? "h-3 bg-blue-100 border-2 border-dashed border-blue-400 rounded" : "h-1"}`}
                          onDragOver={(e) => handleCanvasDragOver(e, idx)}
                          onDrop={(e) => handleCanvasDrop(e, idx)}
                          onDragLeave={() => setDraggingOver(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add block CTA below canvas */}
            {blocks.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                <span className="text-xs text-gray-400">Quick add:</span>
                {[
                  { type: "text" as BlockType, label: "Text" },
                  { type: "button" as BlockType, label: "Button" },
                  { type: "image" as BlockType, label: "Image" },
                  { type: "divider" as BlockType, label: "Divider" },
                  { type: "spacer" as BlockType, label: "Spacer" },
                ].map((b) => (
                  <button
                    key={b.type}
                    onClick={() => addBlock(b.type)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
                  >
                    + {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PROPERTIES PANEL ────────────────────────────────────── */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">
              {selectedBlock
                ? `Edit: ${selectedBlock.type.replace(/-/g, " ")}`
                : "Global Settings"}
            </h3>
            {selectedBlock && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Global
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel
              block={selectedBlock}
              onChange={updateBlock}
              gs={gs}
              onGsChange={setGs}
            />
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
      />
    </div>
  );
}
