"use client";

import { useReducer, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  platform: string;
  name: string;
}

export interface SettingsState {
  // API
  claudeApiKey: string;
  lateApiKey: string;
  claudeModel: string;
  claudeTemperature: number;
  // Pipeline
  defaultQuality: string;
  defaultMaxClips: number;
  defaultMinScore: number;
  defaultMaxDuration: number;
  niche: string;
  subtitles: boolean;
  padBefore: number;
  padAfter: number;
  // Style
  bgStyle: string;
  captionMode: "overlay" | "burn-in";
  captionFontFamily: string;
  captionFontSize: number;
  captionActiveColor: string;
  captionInactiveColor: string;
  captionOutlineColor: string;
  captionPosition: "top" | "center" | "bottom";
  captionMaxWords: number;
  captionAnimation: string;
  // Hook
  hookFontSize: number;
  hookColor: string;
  hookBgColor: string;
  hookPosition: "top" | "center";
  // Scoring
  weightHook: number;
  weightStandalone: number;
  weightControversy: number;
  weightEducation: number;
  weightEmotion: number;
  weightTwist: number;
  weightQuotable: number;
  weightVisual: number;
  weightNicheBonus: number;
  // Connectors
  defaultPlatforms: string[];
  accounts: Account[];
  // UI
  saving: boolean;
  saved: boolean;
  loadingAccounts: boolean;
}

export const DEFAULT_SCORING_WEIGHTS = {
  weightHook: 3,
  weightStandalone: 3,
  weightControversy: 3,
  weightEducation: 3,
  weightEmotion: 1.5,
  weightTwist: 1.5,
  weightQuotable: 1,
  weightVisual: 1,
  weightNicheBonus: 1,
} as const;

const initialState: SettingsState = {
  claudeApiKey: "",
  lateApiKey: "",
  claudeModel: "claude-sonnet-4-20250514",
  claudeTemperature: 0.2,
  defaultQuality: "1080",
  defaultMaxClips: 5,
  defaultMinScore: 7,
  defaultMaxDuration: 59,
  niche: "general",
  subtitles: true,
  padBefore: 1.5,
  padAfter: 0.5,
  bgStyle: "blurred-zoom",
  captionMode: "overlay",
  captionFontFamily: "Arial",
  captionFontSize: 72,
  captionActiveColor: "#FFD700",
  captionInactiveColor: "#FFFFFF99",
  captionOutlineColor: "#000000",
  captionPosition: "bottom",
  captionMaxWords: 5,
  captionAnimation: "typewriter",
  hookFontSize: 56,
  hookColor: "#FFFFFF",
  hookBgColor: "rgba(0,0,0,0.7)",
  hookPosition: "top",
  ...DEFAULT_SCORING_WEIGHTS,
  defaultPlatforms: ["tiktok", "youtube", "instagram"],
  accounts: [],
  saving: false,
  saved: false,
  loadingAccounts: false,
};

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_ALL"; payload: Partial<SettingsState> }
  | { type: "SET_FIELD"; field: keyof SettingsState; value: SettingsState[keyof SettingsState] }
  | { type: "SET_SAVING"; value: boolean }
  | { type: "SET_SAVED"; value: boolean }
  | { type: "SET_LOADING_ACCOUNTS"; value: boolean }
  | { type: "SET_ACCOUNTS"; accounts: Account[] }
  | { type: "RESET_SCORING" }
  | { type: "TOGGLE_PLATFORM"; platform: string };

function settingsReducer(state: SettingsState, action: Action): SettingsState {
  switch (action.type) {
    case "SET_ALL":
      return { ...state, ...action.payload };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SAVING":
      return { ...state, saving: action.value };
    case "SET_SAVED":
      return { ...state, saved: action.value };
    case "SET_LOADING_ACCOUNTS":
      return { ...state, loadingAccounts: action.value };
    case "SET_ACCOUNTS":
      return { ...state, accounts: action.accounts };
    case "RESET_SCORING":
      return { ...state, ...DEFAULT_SCORING_WEIGHTS };
    case "TOGGLE_PLATFORM": {
      const platforms = state.defaultPlatforms.includes(action.platform)
        ? state.defaultPlatforms.filter((p) => p !== action.platform)
        : [...state.defaultPlatforms, action.platform];
      return { ...state, defaultPlatforms: platforms };
    }
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const updateField = useCallback(
    <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => {
      dispatch({ type: "SET_FIELD", field, value: value as SettingsState[keyof SettingsState] });
    },
    []
  );

  const togglePlatform = useCallback((platform: string) => {
    dispatch({ type: "TOGGLE_PLATFORM", platform });
  }, []);

  const resetScoring = useCallback(() => {
    dispatch({ type: "RESET_SCORING" });
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();

      const patch: Partial<SettingsState> = {};

      if (data.claudeApiKey) patch.claudeApiKey = data.claudeApiKey;
      if (data.lateApiKey) patch.lateApiKey = data.lateApiKey;
      if (data.claudeModel) patch.claudeModel = data.claudeModel;
      if (data.claudeTemperature !== undefined) patch.claudeTemperature = data.claudeTemperature;
      if (data.defaultQuality) patch.defaultQuality = data.defaultQuality;
      if (data.defaultMaxClips) patch.defaultMaxClips = data.defaultMaxClips;
      if (data.defaultMinScore) patch.defaultMinScore = data.defaultMinScore;
      if (data.defaultMaxDuration) patch.defaultMaxDuration = data.defaultMaxDuration;
      if (data.niche) patch.niche = data.niche;
      if (data.subtitles !== undefined) patch.subtitles = data.subtitles;
      if (data.padBefore !== undefined) patch.padBefore = data.padBefore;
      if (data.padAfter !== undefined) patch.padAfter = data.padAfter;
      if (data.backgroundFillStyle) patch.bgStyle = data.backgroundFillStyle;
      if (data.defaultPlatforms) patch.defaultPlatforms = data.defaultPlatforms;
      if (data.captionMode) patch.captionMode = data.captionMode;

      if (data.captionStyle) {
        const cs = data.captionStyle;
        if (cs.fontFamily) patch.captionFontFamily = cs.fontFamily;
        if (cs.fontSize) patch.captionFontSize = cs.fontSize;
        if (cs.activeColor) patch.captionActiveColor = cs.activeColor;
        if (cs.inactiveColor) patch.captionInactiveColor = cs.inactiveColor;
        if (cs.outlineColor) patch.captionOutlineColor = cs.outlineColor;
        if (cs.position) patch.captionPosition = cs.position;
        if (cs.maxWordsPerLine) patch.captionMaxWords = cs.maxWordsPerLine;
        if (cs.animationPreset) patch.captionAnimation = cs.animationPreset;
        if (cs.hookFontSize) patch.hookFontSize = cs.hookFontSize;
        if (cs.hookColor) patch.hookColor = cs.hookColor;
        if (cs.hookBgColor) patch.hookBgColor = cs.hookBgColor;
        if (cs.hookPosition) patch.hookPosition = cs.hookPosition;
      }

      if (data.scoringWeights) {
        const sw = data.scoringWeights;
        if (sw.hook !== undefined) patch.weightHook = sw.hook;
        if (sw.standalone !== undefined) patch.weightStandalone = sw.standalone;
        if (sw.controversy !== undefined) patch.weightControversy = sw.controversy;
        if (sw.education !== undefined) patch.weightEducation = sw.education;
        if (sw.emotion !== undefined) patch.weightEmotion = sw.emotion;
        if (sw.twist !== undefined) patch.weightTwist = sw.twist;
        if (sw.quotable !== undefined) patch.weightQuotable = sw.quotable;
        if (sw.visual !== undefined) patch.weightVisual = sw.visual;
        if (sw.nicheBonus !== undefined) patch.weightNicheBonus = sw.nicheBonus;
      }

      dispatch({ type: "SET_ALL", payload: patch });
    } catch {
      // silently fail — fields keep defaults
    }
  }, []);

  const saveSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: "SET_SAVING", value: true });
    dispatch({ type: "SET_SAVED", value: false });

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(state.claudeApiKey && !state.claudeApiKey.includes("...configured") && {
            claudeApiKey: state.claudeApiKey,
          }),
          ...(state.lateApiKey && !state.lateApiKey.includes("...configured") && {
            lateApiKey: state.lateApiKey,
          }),
          claudeModel: state.claudeModel,
          claudeTemperature: state.claudeTemperature,
          defaultQuality: state.defaultQuality,
          defaultMaxClips: state.defaultMaxClips,
          defaultMinScore: state.defaultMinScore,
          defaultMaxDuration: state.defaultMaxDuration,
          niche: state.niche,
          subtitles: state.subtitles,
          padBefore: state.padBefore,
          padAfter: state.padAfter,
          backgroundFillStyle: state.bgStyle,
          defaultPlatforms: state.defaultPlatforms,
          captionMode: state.captionMode,
          captionStyle: {
            fontFamily: state.captionFontFamily,
            fontSize: state.captionFontSize,
            activeColor: state.captionActiveColor,
            inactiveColor: state.captionInactiveColor,
            outlineColor: state.captionOutlineColor,
            position: state.captionPosition,
            maxWordsPerLine: state.captionMaxWords,
            animationPreset: state.captionAnimation,
            hookFontSize: state.hookFontSize,
            hookColor: state.hookColor,
            hookBgColor: state.hookBgColor,
            hookPosition: state.hookPosition,
          },
          scoringWeights: {
            hook: state.weightHook,
            standalone: state.weightStandalone,
            controversy: state.weightControversy,
            education: state.weightEducation,
            emotion: state.weightEmotion,
            twist: state.weightTwist,
            quotable: state.weightQuotable,
            visual: state.weightVisual,
            nicheBonus: state.weightNicheBonus,
          },
        }),
      });

      dispatch({ type: "SET_SAVED", value: true });
      dispatch({ type: "SET_SAVING", value: false });
      return true;
    } catch {
      dispatch({ type: "SET_SAVING", value: false });
      return false;
    }
  }, [state]);

  const fetchAccounts = useCallback(async () => {
    dispatch({ type: "SET_LOADING_ACCOUNTS", value: true });
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      dispatch({ type: "SET_ACCOUNTS", accounts: data.accounts ?? [] });
    } catch {
      // silently fail
    }
    dispatch({ type: "SET_LOADING_ACCOUNTS", value: false });
  }, []);

  return {
    state,
    updateField,
    togglePlatform,
    resetScoring,
    loadSettings,
    saveSettings,
    fetchAccounts,
  };
}
