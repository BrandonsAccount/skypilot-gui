"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Prompt = {
  id: string;
  title?: string;
  body: string;
  createdAt?: number;
};

type PromptContextType = {
  input: string;
  setInput: (s: string) => void;
  prompts: Prompt[]; // common prompts
  recentPrompts: Prompt[]; // persisted recent prompts
  addRecent: (p: { title?: string; body: string }) => void;
  clearRecents: () => void;
};

const PromptContext = createContext<PromptContextType | undefined>(undefined);

const LOCAL_KEY = "skypilot:recent_prompts";
const RECENT_MAX = 10;

// Example set of common prompts: short title + full body
const COMMON_PROMPTS: Prompt[] = [
  {
    id: "p1",
    title: "API integration testing",
    body: "Describe the proper way to perform API integration testing for a REST API, including any tools or libraries you would use.",
  },
  {
    id: "p2",
    title: "Getting started with application testing",
    body: "Rewrite the following paragraph to improve clarity and conciseness while preserving the original meaning.",
  },
  {
    id: "p3",
    title: "Social post ideas",
    body: "Generate 10 unique social media post ideas promoting product X, each under 140 characters and with a suggested hashtag.",
  },
  {
    id: "p4",
    title: "Short customer email",
    body: "Write a short polite email responding to a customer complaint about a late shipment, including an apology and next steps.",
  },
  {
    id: "p5",
    title: "Explain like I'm 5",
    body: "Explain the following concept in simple terms suitable for a 5th grader, using analogies where appropriate.",
  },
];

function loadRecents(): Prompt[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveRecents(list: Prompt[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState<string>("");
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    // Load on mount (client)
    try {
      const loaded = loadRecents();
      setRecentPrompts(loaded);
    } catch {
      setRecentPrompts([]);
    }
  }, []);

  useEffect(() => {
    // Persist on change
    saveRecents(recentPrompts);
  }, [recentPrompts]);

  function addRecent({ title, body }: { title?: string; body: string }) {
    if (!body || !body.trim()) return;
    const normalizedBody = body.trim();

    // Avoid duplicate consecutive entries
    if (recentPrompts.length > 0 && recentPrompts[0].body === normalizedBody) {
      return;
    }

    const newEntry: Prompt = {
      id: `r_${Date.now()}`,
      title,
      body: normalizedBody,
      createdAt: Date.now(),
    };

    const next = [newEntry, ...recentPrompts].slice(0, RECENT_MAX);
    setRecentPrompts(next);
  }

  function clearRecents() {
    setRecentPrompts([]);
  }

  const value: PromptContextType = {
    input,
    setInput,
    prompts: COMMON_PROMPTS,
    recentPrompts,
    addRecent,
    clearRecents,
  };

  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error("usePrompt must be used within a PromptProvider");
  }
  return ctx;
}