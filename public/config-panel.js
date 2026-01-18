const DEFAULT_PROFILES = [
  {
    id: "default",
    name: "Default",
    description: "Baseline configuration for most sessions.",
    overrides: {}
  },
  {
    id: "fast",
    name: "Fast",
    description: "Lower latency defaults for quick turns.",
    overrides: {
      model: "gpt-test-model-lite",
      modelReasoningEffort: "low",
      approvalPolicy: "never"
    }
  },
  {
    id: "safe",
    name: "Safe",
    description: "Stricter approvals and sandbox defaults.",
    overrides: {
      approvalPolicy: "on-request",
      sandboxMode: "read-only",
      networkAccessEnabled: false
    }
  }
];

const DEFAULT_PROVIDERS = {
  model: [
    { id: "openai", label: "OpenAI", description: "Hosted models" },
    { id: "azure-openai", label: "Azure OpenAI", description: "Enterprise hosted" }
  ],
  oss: [
    { id: "ollama", label: "Ollama", description: "Local model server" },
    { id: "llama-cpp", label: "Llama.cpp", description: "Native runtime" }
  ]
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep(base = {}, overrides = {}) {
  const result = { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    if (isObject(value) && isObject(result[key])) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function normalizeProfile(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || entry.key || entry.name || `profile-${index}`).trim();
  if (!id) return null;
  const overrides =
    (isObject(entry.overrides) && entry.overrides) ||
    (isObject(entry.config) && entry.config) ||
    (isObject(entry.settings) && entry.settings) ||
    {};
  return {
    id,
    name: entry.name || entry.label || id,
    description: entry.description || entry.note || "",
    overrides
  };
}

function normalizeProfiles(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry, index) => normalizeProfile(entry, index))
    .filter(Boolean);
}

function normalizeProvider(entry, index, prefix) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || entry.key || entry.name || `${prefix}-${index}`).trim();
  if (!id) return null;
  return {
    id,
    label: entry.label || entry.name || id,
    description: entry.description || entry.note || ""
  };
}

function normalizeProviderList(list, fallback, prefix) {
  const normalized = Array.isArray(list)
    ? list.map((entry, index) => normalizeProvider(entry, index, prefix)).filter(Boolean)
    : [];
  if (normalized.length) return normalized;
  return fallback.map((entry, index) => normalizeProvider(entry, index, prefix)).filter(Boolean);
}

function normalizeProviders(rawProviders = {}, modelProviders, ossProviders) {
  const model = normalizeProviderList(
    rawProviders.model || rawProviders.models || modelProviders,
    DEFAULT_PROVIDERS.model,
    "model"
  );
  const oss = normalizeProviderList(
    rawProviders.oss || rawProviders.openSource || rawProviders.ossProviders || ossProviders,
    DEFAULT_PROVIDERS.oss,
    "oss"
  );
  return { model, oss };
}

function toOption(label, value) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

export function createConfigPanel({ panel, closeBtn, appConfig = {}, elements = {} }) {
  const {
    profileSelect,
    profileMeta,
    previewEl,
    modelProviderSelect,
    ossProviderSelect,
    providerSummaryEl,
    providerModelValue,
    providerOssValue
  } = elements;

  let baseConfig = isObject(appConfig.baseConfig) ? appConfig.baseConfig : {};
  let profiles = normalizeProfiles(appConfig.configProfiles || appConfig.profiles);
  if (!profiles.length) profiles = DEFAULT_PROFILES;
  let providers = normalizeProviders(appConfig.providers || {}, appConfig.modelProviders, appConfig.ossProviders);

  const defaults = appConfig.defaultProviders || appConfig.providerDefaults || {};
  const presetProviders = appConfig.selectedProviders || appConfig.providerSelection || {};
  let state = {
    profileId: appConfig.defaultProfileId || appConfig.selectedProfileId || profiles[0]?.id || "",
    modelProviderId: presetProviders.model || defaults.model || "",
    ossProviderId: presetProviders.oss || defaults.oss || ""
  };

  function getProfileById(id) {
    return profiles.find((profile) => profile.id === id) || profiles[0] || null;
  }

  function getProviderById(kind, id) {
    const list = providers[kind] || [];
    return list.find((provider) => provider.id === id) || null;
  }

  function getProviderLabel(kind, id) {
    const provider = getProviderById(kind, id);
    return provider ? provider.label : "Default";
  }

  function ensureSelectionsValid() {
    if (state.profileId && !getProfileById(state.profileId)) {
      state.profileId = profiles[0]?.id || "";
    }
    if (state.modelProviderId && !getProviderById("model", state.modelProviderId)) {
      state.modelProviderId = "";
    }
    if (state.ossProviderId && !getProviderById("oss", state.ossProviderId)) {
      state.ossProviderId = "";
    }
  }

  function renderProfileSelect() {
    if (!profileSelect) return;
    profileSelect.innerHTML = "";
    profiles.forEach((profile) => {
      const option = toOption(profile.name, profile.id);
      if (profile.description) option.dataset.description = profile.description;
      profileSelect.appendChild(option);
    });
    profileSelect.value = state.profileId || profiles[0]?.id || "";
  }

  function renderProfileMeta(profile) {
    if (!profileMeta) return;
    if (!profile?.description) {
      profileMeta.textContent = "";
      profileMeta.hidden = true;
      return;
    }
    profileMeta.textContent = profile.description;
    profileMeta.hidden = false;
  }

  function computeEffectiveConfig(profile) {
    const overrides = profile?.overrides || {};
    return mergeDeep(baseConfig, overrides);
  }

  function renderPreview(profile) {
    if (!previewEl) return;
    const effective = computeEffectiveConfig(profile);
    const text = JSON.stringify(effective, null, 2) || "{}";
    previewEl.textContent = text;
    previewEl.dataset.profile = profile?.id || "";
  }

  function renderProviderSelect(selectEl, list, value) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    selectEl.appendChild(toOption("Default", ""));
    list.forEach((provider) => {
      const option = toOption(provider.label, provider.id);
      if (provider.description) option.dataset.description = provider.description;
      selectEl.appendChild(option);
    });
    selectEl.value = value || "";
  }

  function renderProviderSummary() {
    const modelLabel = getProviderLabel("model", state.modelProviderId);
    const ossLabel = getProviderLabel("oss", state.ossProviderId);
    if (providerSummaryEl) {
      providerSummaryEl.textContent = `Providers: Model: ${modelLabel} / OSS: ${ossLabel}`;
      providerSummaryEl.dataset.modelProvider = state.modelProviderId || "";
      providerSummaryEl.dataset.ossProvider = state.ossProviderId || "";
    }
    if (providerModelValue) providerModelValue.textContent = modelLabel;
    if (providerOssValue) providerOssValue.textContent = ossLabel;
  }

  function render() {
    ensureSelectionsValid();
    renderProfileSelect();
    const profile = getProfileById(state.profileId);
    renderProfileMeta(profile);
    renderPreview(profile);
    renderProviderSelect(modelProviderSelect, providers.model || [], state.modelProviderId);
    renderProviderSelect(ossProviderSelect, providers.oss || [], state.ossProviderId);
    renderProviderSummary();
  }

  function handleProfileChange() {
    state.profileId = profileSelect?.value || "";
    const profile = getProfileById(state.profileId);
    renderProfileMeta(profile);
    renderPreview(profile);
  }

  function handleProviderChange() {
    state.modelProviderId = modelProviderSelect?.value || "";
    state.ossProviderId = ossProviderSelect?.value || "";
    renderProviderSummary();
  }

  function open() {
    render();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  function setProfiles(nextProfiles = [], nextBaseConfig) {
    profiles = normalizeProfiles(nextProfiles);
    if (!profiles.length) profiles = DEFAULT_PROFILES;
    if (isObject(nextBaseConfig)) baseConfig = nextBaseConfig;
    state.profileId = profiles[0]?.id || "";
    render();
  }

  function setProviders(nextProviders = {}) {
    providers = normalizeProviders(nextProviders, nextProviders.model, nextProviders.oss);
    ensureSelectionsValid();
    render();
  }

  function setProviderSelection(selection = {}) {
    if (selection.model !== undefined) state.modelProviderId = selection.model || "";
    if (selection.oss !== undefined) state.ossProviderId = selection.oss || "";
    renderProviderSummary();
    if (modelProviderSelect) modelProviderSelect.value = state.modelProviderId;
    if (ossProviderSelect) ossProviderSelect.value = state.ossProviderId;
  }

  function setProfile(profileId) {
    state.profileId = profileId || profiles[0]?.id || "";
    if (profileSelect) profileSelect.value = state.profileId;
    const profile = getProfileById(state.profileId);
    renderProfileMeta(profile);
    renderPreview(profile);
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (profileSelect) profileSelect.addEventListener("change", handleProfileChange);
  if (modelProviderSelect) modelProviderSelect.addEventListener("change", handleProviderChange);
  if (ossProviderSelect) ossProviderSelect.addEventListener("change", handleProviderChange);

  render();

  return {
    open,
    close,
    refresh: render,
    setProfiles,
    setProviders,
    setProfile,
    setProviderSelection,
    getState: () => ({
      profileId: state.profileId,
      effectiveConfig: computeEffectiveConfig(getProfileById(state.profileId)),
      providers: {
        model: state.modelProviderId,
        oss: state.ossProviderId
      }
    })
  };
}
