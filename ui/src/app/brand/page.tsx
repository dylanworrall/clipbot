"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Globe,
  Save,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Megaphone,
  Target,
  MessageCircle,
  BookOpen,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";

interface BrandProfile {
  url: string;
  name: string;
  tagline: string;
  tone: string;
  audience: string;
  topics: string[];
  keywords: string[];
  competitors: string[];
  contentPillars: string[];
  voiceExamples: string[];
  createdAt: string;
  updatedAt: string;
}

const EMPTY_BRAND: BrandProfile = {
  url: "",
  name: "",
  tagline: "",
  tone: "",
  audience: "",
  topics: [],
  keywords: [],
  competitors: [],
  contentPillars: [],
  voiceExamples: [],
  createdAt: "",
  updatedAt: "",
};

function TagPills({
  items,
  onChange,
  color = "blue",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  color?: "blue" | "purple" | "green" | "orange";
}) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  const colorMap = {
    blue: "bg-[#0A84FF]/10 text-[#0A84FF]",
    purple: "bg-[#BF5AF2]/10 text-[#BF5AF2]",
    green: "bg-[#30D158]/10 text-[#30D158]",
    orange: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  };

  const handleAdd = () => {
    if (newTag.trim()) {
      onChange([...items, newTag.trim()]);
      setNewTag("");
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${colorMap[color]} text-[12px] font-medium`}
        >
          {item}
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {adding ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewTag(""); }
            }}
            className="bg-[#1C1C1E] rounded-lg px-2 py-1 text-[12px] text-white border border-white/10 focus:outline-none focus:border-[#0A84FF]/50 transition-colors w-28"
            placeholder="Add..."
          />
          <button onClick={handleAdd} className="text-[#0A84FF] cursor-pointer">
            <Plus size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="px-2 py-1 rounded-lg border border-dashed border-white/10 text-[12px] text-white/30 hover:text-white/60 hover:border-white/20 transition-colors cursor-pointer"
        >
          <Plus size={10} />
        </button>
      )}
    </div>
  );
}

function EditableList({
  items,
  onChange,
  placeholder = "Add item...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={`${item}-${i}`} className="flex items-start gap-2 group">
          <span className="text-[#0A84FF]/40 text-[12px] mt-0.5 font-mono">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-[14px] text-white/70 flex-1 leading-relaxed">
            {item}
          </p>
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-[#FF453A] transition-all cursor-pointer mt-0.5"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex items-start gap-2">
          <span className="text-[#0A84FF]/40 text-[12px] mt-2.5 font-mono">
            {String(items.length + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 space-y-2">
            <textarea
              autoFocus
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
                if (e.key === "Escape") { setAdding(false); setNewItem(""); }
              }}
              className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors resize-none"
              placeholder={placeholder}
              rows={2}
            />
            <div className="flex gap-1.5">
              <Button size="xs" onClick={handleAdd}>
                Add
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => { setAdding(false); setNewItem(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-[12px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          <Plus size={12} /> Add item
        </button>
      )}
    </div>
  );
}

export default function BrandPage() {
  const [brand, setBrand] = useState<BrandProfile>(EMPTY_BRAND);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [dirty, setDirty] = useState(false);

  const loadBrand = useCallback(async () => {
    try {
      const res = await fetch("/api/brand");
      const data = await res.json();
      if (data && data.name) {
        setBrand(data);
        setUrl(data.url || "");
      }
    } catch {
      /* no brand yet */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.profile) {
        setBrand(data.profile);
        setDirty(false);
      }
    } catch {
      /* fail silently */
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      setDirty(false);
    } catch {
      /* fail silently */
    }
    setSaving(false);
  };

  const update = (field: keyof BrandProfile, value: string | string[]) => {
    setBrand((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const hasBrand = brand.name.length > 0;

  return (
    <PageTransition>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white/90 mb-1">Brand</h1>
              <p className="text-white/50 text-[13px] font-medium">
                {hasBrand
                  ? "Your brand profile powers all AI-generated content"
                  : "Analyze your website to create a brand profile"}
              </p>
            </div>
            {hasBrand && dirty && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </Button>
            )}
          </div>

          {/* URL Input */}
          <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm mb-6">
            <label className="text-[12px] font-medium text-white/40 block mb-2">
              Website URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Globe
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://yoursite.com"
                  className="w-full bg-[#1C1C1E] rounded-lg pl-9 pr-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                />
              </div>
              <Button onClick={handleAnalyze} disabled={analyzing || !url.trim()}>
                {analyzing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : hasBrand ? (
                  <RefreshCw size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                {analyzing
                  ? "Analyzing..."
                  : hasBrand
                    ? "Re-analyze"
                    : "Analyze"}
              </Button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-white/40" />
            </div>
          )}

          {/* Empty State */}
          {!loading && !hasBrand && !analyzing && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-[#BF5AF2]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-[#BF5AF2]" />
              </div>
              <p className="text-[15px] font-medium text-white/50">
                No brand profile yet
              </p>
              <p className="text-[13px] text-white/30 mt-1 max-w-sm mx-auto">
                Enter your website URL above to auto-extract your brand
                identity, or fill in the details manually
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() =>
                  setBrand({
                    ...EMPTY_BRAND,
                    name: "My Brand",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <Plus size={14} /> Create Manually
              </Button>
            </div>
          )}

          {/* Brand Profile Editor */}
          <AnimatePresence>
            {hasBrand && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Identity Card */}
                <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Megaphone size={14} className="text-[#0A84FF]" />
                    <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                      Identity
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-1.5">
                        Brand Name
                      </label>
                      <input
                        value={brand.name}
                        onChange={(e) => update("name", e.target.value)}
                        className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-1.5">
                        Tagline
                      </label>
                      <input
                        value={brand.tagline}
                        onChange={(e) => update("tagline", e.target.value)}
                        placeholder="A short description of what you do"
                        className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Voice & Audience Card */}
                <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle size={14} className="text-[#BF5AF2]" />
                    <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                      Voice & Audience
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-1.5">
                        Tone of Voice
                      </label>
                      <input
                        value={brand.tone}
                        onChange={(e) => update("tone", e.target.value)}
                        placeholder="e.g. casual and bold, professional, edgy and meme-friendly"
                        className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-1.5">
                        Target Audience
                      </label>
                      <textarea
                        value={brand.audience}
                        onChange={(e) => update("audience", e.target.value)}
                        placeholder="Describe your target audience..."
                        rows={3}
                        className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Topics & Keywords */}
                <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag size={14} className="text-[#30D158]" />
                    <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                      Topics & Keywords
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-2">
                        Topics
                      </label>
                      <TagPills
                        items={brand.topics}
                        onChange={(v) => update("topics", v)}
                        color="blue"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-2">
                        Keywords
                      </label>
                      <TagPills
                        items={brand.keywords}
                        onChange={(v) => update("keywords", v)}
                        color="green"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-white/40 block mb-2">
                        Competitors
                      </label>
                      <TagPills
                        items={brand.competitors}
                        onChange={(v) => update("competitors", v)}
                        color="orange"
                      />
                    </div>
                  </div>
                </div>

                {/* Content Pillars */}
                <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={14} className="text-[#FF9F0A]" />
                    <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                      Content Pillars
                    </h2>
                  </div>
                  <TagPills
                    items={brand.contentPillars}
                    onChange={(v) => update("contentPillars", v)}
                    color="purple"
                  />
                </div>

                {/* Voice Examples */}
                <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={14} className="text-[#FF453A]" />
                    <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                      Voice Examples
                    </h2>
                  </div>
                  <p className="text-[12px] text-white/30 mb-3">
                    Example sentences in your brand voice. These teach the AI
                    your writing style.
                  </p>
                  <EditableList
                    items={brand.voiceExamples}
                    onChange={(v) => update("voiceExamples", v)}
                    placeholder="Write a sentence in your brand voice..."
                  />
                </div>

                {/* Footer Save */}
                {dirty && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end pb-8"
                  >
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save Brand Profile
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
