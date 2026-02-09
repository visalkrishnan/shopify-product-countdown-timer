import { useState } from "react";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import {
  Page, Layout, Card, ResourceList, ResourceItem, Text, Button, 
  Modal, FormLayout, TextField, Select, BlockStack, InlineStack, 
  Icon, Badge, Box, ColorPicker, Grid, EmptyState, Banner
} from "@shopify/polaris";
import { SearchIcon, CalendarIcon, ClockIcon, MagicIcon, ViewIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getTimers, upsertTimer, deleteTimer } from "../models/timer.server";

// --- LOADER & ACTION (No changes needed here) ---
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const rawTimers = await getTimers(session.shop);
  const timers = rawTimers.map(t => ({ ...t, _id: t._id.toString() }));
  return { timers, shop: session.shop };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteTimer(formData.get("id"), session.shop);
    return { status: "deleted" };
  }

  const startDateTime = new Date(`${formData.get("startDate")}T${formData.get("startTime")}:00`);
  const endDateTime = new Date(`${formData.get("endDate")}T${formData.get("endTime")}:00`);

  const data = {
    _id: formData.get("id") || null,
    shop: session.shop,
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    duration: parseInt(formData.get("duration") || 0),
    targetType: formData.get("targetType"),
    productIds: formData.get("productIds") ? JSON.parse(formData.get("productIds")) : [],
    collectionIds: formData.get("collectionIds") ? JSON.parse(formData.get("collectionIds")) : [],
    startDate: startDateTime.toISOString(),
    endDate: endDateTime.toISOString(),
    display: {
      position: formData.get("position"),
      size: formData.get("size"),
      color: formData.get("colorHex"),
    },
    urgency: {
      type: formData.get("urgencyType"),
      minutes: parseInt(formData.get("urgencyMinutes") || 5),
      color: formData.get("urgencyColorHex"),
    },
  };

  await upsertTimer(data);
  return { status: "saved" };
}

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const { timers } = useLoaderData();
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const [activeModal, setActiveModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [formState, setFormState] = useState(initialState());
  const [timerColorHSB, setTimerColorHSB] = useState({ hue: 120, saturation: 1, brightness: 1 });
  const [urgencyColorHSB, setUrgencyColorHSB] = useState({ hue: 0, saturation: 1, brightness: 1 });

  function initialState() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    return {
      id: "",
      title: "",
      type: "fixed",
      duration: 60,
      startDate: now.toISOString().slice(0, 10),
      startTime: "00:00",
      endDate: tomorrow.toISOString().slice(0, 10),
      endTime: "23:59",
      description: "Limited Time Offer!",
      targetType: "product",
      productIds: [],
      collectionIds: [],
      display: { position: "top", size: "medium", color: "#008000" },
      urgency: { type: "pulse", minutes: 15, color: "#d32f2f" },
    };
  }

  const handleOpenModal = (timer = null) => {
    if (timer) {
      let startYMD = "", startTime = "00:00", endYMD = "", endTime = "23:59";
      try {
        if (timer.startDate) {
          startYMD = timer.startDate.slice(0, 10);
          startTime = timer.startDate.slice(11, 16);
          endYMD = timer.endDate.slice(0, 10);
          endTime = timer.endDate.slice(11, 16);
        }
      } catch (e) {}

      setFormState({
        id: timer._id,
        title: timer.title,
        type: timer.type || "fixed",
        duration: timer.duration || 60,
        startDate: startYMD,
        startTime: startTime,
        endDate: endYMD,
        endTime: endTime,
        description: timer.description,
        targetType: timer.targetType === 'all' ? 'all' : (timer.collectionIds?.length > 0 ? 'collection' : 'product'),
        productIds: timer.productIds || [],
        collectionIds: timer.collectionIds || [],
        display: timer.display || { position: "top", size: "medium", color: "#008000" },
        urgency: timer.urgency || { type: "pulse", minutes: 15, color: "#d32f2f" },
      });
    } else {
      setFormState(initialState());
    }
    setActiveModal(true);
  };

  const handleProductSelect = async () => {
    const selection = await window.shopify.resourcePicker({ type: "product", multiple: true });
    if (selection) {
      setFormState((prev) => ({ ...prev, productIds: selection.map((p) => p.id) }));
    }
  };

  const handleCollectionSelect = async () => {
    const selection = await window.shopify.resourcePicker({ type: "collection", multiple: true });
    if (selection) {
      setFormState((prev) => ({ ...prev, collectionIds: selection.map((c) => c.id) }));
    }
  };

const handleGenerateAI = async () => {
    setIsGeneratingAi(true);
    try {
        // ✅ SEND CONTEXT: Pass the prompt and the selected IDs
        const response = await fetch("/api/generate-ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                prompt: aiPrompt, 
                productIds: formState.productIds,
                collectionIds: formState.collectionIds,
            }),
        });

        if (!response.ok) {
            throw new Error("AI generation failed");
        }

        const data = await response.json();
        
        if (data.success) {
            setFormState(prev => ({
                ...prev,
                title: data.title,
                description: data.description,
                duration: data.duration || 60,
                type: data.type || "fixed"
            }));
            setShowAiModal(false);
            setAiPrompt("");
        } else {
            // Handle API error message if provided
            console.error("AI Error:", data.error);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    } finally {
        setIsGeneratingAi(false);
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("id", formState.id || "");
    formData.append("title", formState.title);
    formData.append("description", formState.description);
    formData.append("type", formState.type);
    formData.append("duration", formState.duration);
    
    // Logic to set targeting type based on which IDs are present
    let finalTargetType = 'all';
    if (formState.targetType === 'product' && formState.productIds.length > 0) finalTargetType = 'product';
    if (formState.targetType === 'collection' && formState.collectionIds.length > 0) finalTargetType = 'collection';
    
    formData.append("targetType", formState.targetType); // Send the UI state
    formData.append("productIds", JSON.stringify(formState.productIds));
    formData.append("collectionIds", JSON.stringify(formState.collectionIds));

    formData.append("startDate", formState.startDate);
    formData.append("startTime", formState.startTime);
    formData.append("endDate", formState.endDate);
    formData.append("endTime", formState.endTime);
    
    formData.append("position", formState.display.position);
    formData.append("size", formState.display.size);
    formData.append("colorHex", formState.display.color);
    
    formData.append("urgencyType", formState.urgency.type);
    formData.append("urgencyMinutes", formState.urgency.minutes);
    formData.append("urgencyColorHex", formState.urgency.color);
    
    formData.append("intent", "save");
    submit(formData, { method: "post" });
    setActiveModal(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this timer?")) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
    }
  };

  const handleTimerColorChange = (newColor) => {
    setTimerColorHSB(newColor);
    const colorString = `hsl(${newColor.hue}, ${newColor.saturation * 100}%, ${newColor.brightness * 100}%)`;
    setFormState((prev) => ({ ...prev, display: { ...prev.display, color: colorString } }));
  };
  const handleUrgencyColorChange = (newColor) => {
    setUrgencyColorHSB(newColor);
    const colorString = `hsl(${newColor.hue}, ${newColor.saturation * 100}%, ${newColor.brightness * 100}%)`;
    setFormState((prev) => ({ ...prev, urgency: { ...prev.urgency, color: colorString } }));
  };

  const filteredTimers = timers.filter((t) => t.title.toLowerCase().includes(searchValue.toLowerCase()));

  return (
    <Page fullWidth title="Countdown Timer Manager">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: '16px', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '300px' }}>
                <TextField value={searchValue} onChange={setSearchValue} prefix={<Icon source={SearchIcon} />} placeholder="Search timers..." autoComplete="off" />
              </div>
              <Button variant="primary" onClick={() => handleOpenModal(null)}>+ Create timer</Button>
            </div>
            <ResourceList
              resourceName={{ singular: 'timer', plural: 'timers' }}
              items={filteredTimers}
              renderItem={(item) => {
                const { _id, title, endDate, type, views } = item;
                const isActive = new Date(endDate) > new Date() || type === 'evergreen';
                return (
                  <ResourceItem id={_id} onClick={() => handleOpenModal(item)}
                    media={<div style={{ background: isActive ? '#e3f1df' : '#fbeae5', padding: '5px', borderRadius: '4px' }}><Icon source={ClockIcon} /></div>}
                    shortcutActions={[{ content: 'Delete', destructive: true, onAction: () => handleDelete(_id) }]}
                  >
                    <InlineStack align="space-between">
                      <BlockStack>
                        <Text fontWeight="bold">{title}</Text>
                        <InlineStack gap="200">
                          <Badge tone="info">{type === 'evergreen' ? 'Evergreen' : 'Fixed Date'}</Badge>
                          <Badge>{item.targetType === 'all' ? 'All Products' : (item.collectionIds?.length > 0 ? 'Collections' : 'Products')}</Badge>
                        </InlineStack>
                      </BlockStack>
                      <InlineStack gap="400">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Icon source={ViewIcon} tone="subdued" />
                          <Text tone="subdued">{views || 0} views</Text>
                        </div>
                        <Badge tone={isActive ? "success" : "critical"}>{isActive ? "Active" : "Expired"}</Badge>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Modal open={activeModal} onClose={() => setActiveModal(false)} title={formState.id ? "Edit Timer" : "Create New Timer"}
        primaryAction={{ content: "Save", onAction: handleSave, loading: isLoading }}
        secondaryActions={[{ content: "Cancel", onAction: () => setActiveModal(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingSm">Timer Details</Text>
              <Button icon={MagicIcon} onClick={() => setShowAiModal(true)} tone="magic">Generate with AI</Button>
            </InlineStack>
            <TextField label="Timer name *" value={formState.title} onChange={(v) => setFormState({ ...formState, title: v })} autoComplete="off" />
            
            <Text variant="headingSm">Timer Behavior</Text>
            <Select
              label="Type"
              options={[{ label: 'Fixed Date (Same for everyone)', value: 'fixed' }, { label: 'Evergreen (Reset per visitor)', value: 'evergreen' }]}
              value={formState.type}
              onChange={(v) => setFormState({ ...formState, type: v })}
            />
            
            {/* ✅ FIX: Show Duration ONLY if Evergreen */}
            {formState.type === 'evergreen' && (
              <TextField
                label="Duration (Minutes)"
                type="number"
                helpText="How long the timer lasts for each visitor (e.g. 60 mins)"
                value={String(formState.duration)}
                onChange={(v) => setFormState({ ...formState, duration: v })}
                autoComplete="off"
              />
            )}

            <Text variant="headingSm">Campaign Schedule</Text>
            <Banner tone="info">
              Set the global start and end date for this promotion. Evergreen timers will only run within this window.
            </Banner>
            {/* ✅ FIX: ALWAYS show the date fields */}
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6 }}><TextField label="Start date" type="date" value={formState.startDate} onChange={(v) => setFormState({ ...formState, startDate: v })} autoComplete="off" /></Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6 }}><TextField label="Start time" type="time" value={formState.startTime} onChange={(v) => setFormState({ ...formState, startTime: v })} autoComplete="off" /></Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6 }}><TextField label="End date" type="date" value={formState.endDate} onChange={(v) => setFormState({ ...formState, endDate: v })} autoComplete="off" /></Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6 }}><TextField label="End time" type="time" value={formState.endTime} onChange={(v) => setFormState({ ...formState, endTime: v })} autoComplete="off" /></Grid.Cell>
            </Grid>
            
            <TextField label="Display Text" value={formState.description} onChange={(v) => setFormState({ ...formState, description: v })} multiline={2} autoComplete="off" />

            <Box paddingBlockStart="400">
              <Text variant="headingSm">Targeting</Text>
              <Select
                label="Apply to"
                options={[{ label: 'Specific Products', value: 'product' }, { label: 'Specific Collections', value: 'collection' }, { label: 'All Products (Global)', value: 'all' }]}
                value={formState.targetType}
                onChange={(v) => setFormState((prev) => ({ ...prev, targetType: v }))}
              />
              {formState.targetType === 'product' && (
                <InlineStack gap="200" align="start" blockAlign="center"><Button onClick={handleProductSelect}>Select Products</Button><Text tone="subdued">{formState.productIds.length} selected</Text></InlineStack>
              )}
              {formState.targetType === 'collection' && (
                <InlineStack gap="200" align="start" blockAlign="center"><Button onClick={handleCollectionSelect}>Select Collections</Button><Text tone="subdued">{formState.collectionIds.length} selected</Text></InlineStack>
              )}
            </Box>

            <Text variant="headingSm">Appearance</Text>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6 }}>
                <Select label="Position" options={['top', 'bottom']} value={formState.display.position} onChange={(v) => setFormState({ ...formState, display: { ...formState.display, position: v } })} />
                <div style={{ marginTop: '10px' }}>
                  <Select label="Size" options={['small', 'medium', 'large']} value={formState.display.size} onChange={(v) => setFormState({ ...formState, display: { ...formState.display, size: v } })} />
                </div>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6 }}>
                <Text>Standard Color</Text>
                <div style={{ marginTop: '5px' }}><ColorPicker onChange={handleTimerColorChange} color={timerColorHSB} allowAlpha={false} /></div>
              </Grid.Cell>
            </Grid>
            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
              <Text variant="headingSm">Urgency Settings</Text><br />
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <BlockStack gap="200">
                    <Select label="Type" options={[{ label: 'None', value: 'none' }, { label: 'Pulse', value: 'pulse' }, { label: 'Banner', value: 'banner' }]} value={formState.urgency.type} onChange={(v) => setFormState({ ...formState, urgency: { ...formState.urgency, type: v } })} />
                    {formState.urgency.type !== 'none' && (
                      <TextField type="number" label="Trigger (min left)" value={String(formState.urgency.minutes)} onChange={(v) => setFormState({ ...formState, urgency: { ...formState.urgency, minutes: v } })} autoComplete="off" />
                    )}
                  </BlockStack>
                </Grid.Cell>
                {formState.urgency.type !== 'none' && (
                  <Grid.Cell columnSpan={{ xs: 6 }}>
                    <Text>Warning Color</Text>
                    <div style={{ marginTop: '5px' }}><ColorPicker onChange={handleUrgencyColorChange} color={urgencyColorHSB} allowAlpha={false} /></div>
                  </Grid.Cell>
                )}
              </Grid>
            </Box>
          </FormLayout>
        </Modal.Section>
      </Modal>

      <Modal open={showAiModal} onClose={() => setShowAiModal(false)}
        title="Generate with AI"
        primaryAction={{ content: "Generate", onAction: handleGenerateAI, loading: isGeneratingAi }}
        secondaryActions={[{ content: "Cancel", onAction: () => setShowAiModal(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="info">Describe your promotion (e.g., "Flash sale for summer collection, ends in 24 hours") and AI will suggest the title and settings.</Banner>
            <TextField label="What is your promotion?" value={aiPrompt} onChange={setAiPrompt} multiline={3} autoFocus placeholder="e.g. Urgent flash sale for Black Friday..." />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}