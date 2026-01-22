import { useState } from "react";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import {
  Page, Layout, Card, ResourceList, ResourceItem, Text, Button, 
  Modal, FormLayout, TextField, Select, BlockStack, InlineStack, 
  Icon, Badge, Box, Checkbox, ColorPicker, Grid, EmptyState
} from "@shopify/polaris";
import { SearchIcon, CalendarIcon, ClockIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getTimers, upsertTimer, deleteTimer } from "../models/timer.server";

// --- LOADER & ACTION ---
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

  // Construct Timer Data
  const data = {
    _id: formData.get("id") || null,
    shop: session.shop,
    title: formData.get("title"),
    description: formData.get("description"),
    targetType: formData.get("targetType"), 
    productIds: formData.get("productIds") ? JSON.parse(formData.get("productIds")) : [],
    
    startDate: new Date(`${formData.get("startDate")}T${formData.get("startTime")}`).toISOString(),
    endDate: new Date(`${formData.get("endDate")}T${formData.get("endTime")}`).toISOString(),

    display: {
      position: formData.get("position"),
      size: formData.get("size"),
      color: formData.get("colorHex"), 
    },
    urgency: {
      type: formData.get("urgencyType"),
      minutes: parseInt(formData.get("urgencyMinutes") || 5),
      // ✅ Save Urgency Color
      color: formData.get("urgencyColorHex"), 
    }
  };

  await upsertTimer(data);
  return { status: "saved" };
}

export default function Dashboard() {
  const { timers } = useLoaderData();
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const [activeModal, setActiveModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const [formState, setFormState] = useState(initialState());
  
  // Color Picker States (HSB objects for Polaris)
  const [timerColor, setTimerColor] = useState({ hue: 120, saturation: 1, brightness: 1 }); // Green
  const [urgencyColor, setUrgencyColor] = useState({ hue: 0, saturation: 1, brightness: 1 }); // Red

  function initialState() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      id: "",
      title: "",
      startDate: now.toISOString().split('T')[0],
      startTime: "00:00",
      endDate: tomorrow.toISOString().split('T')[0],
      endTime: "23:59",
      description: "Limited Time Offer!",
      targetType: "specific",
      productIds: [],
      display: { position: "top", size: "medium", color: "#008000" },
      // ✅ Added color default
      urgency: { type: "pulse", minutes: 15, color: "#d32f2f" } 
    };
  }

  const handleOpenModal = (timer = null) => {
    if (timer) {
      const startObj = new Date(timer.startDate);
      const endObj = new Date(timer.endDate);
      
      setFormState({
        id: timer._id,
        title: timer.title,
        startDate: startObj.toISOString().split('T')[0],
        startTime: startObj.toTimeString().slice(0, 5),
        endDate: endObj.toISOString().split('T')[0],
        endTime: endObj.toTimeString().slice(0, 5),
        description: timer.description,
        targetType: timer.targetType || "specific",
        productIds: timer.productIds || [],
        display: timer.display || { position: "top", size: "medium", color: "#008000" },
        urgency: timer.urgency || { type: "pulse", minutes: 15, color: "#d32f2f" }
      });
      // Reset pickers to defaults (simplified for demo)
      setTimerColor({ hue: 120, saturation: 1, brightness: 1 });
      setUrgencyColor({ hue: 0, saturation: 1, brightness: 1 });
    } else {
      setFormState(initialState());
      setTimerColor({ hue: 120, saturation: 1, brightness: 1 });
      setUrgencyColor({ hue: 0, saturation: 1, brightness: 1 });
    }
    setActiveModal(true);
  };

  const handleProductSelect = async () => {
    const selection = await window.shopify.resourcePicker({ type: "product", multiple: true });
    if (selection) {
      const ids = selection.map(p => p.id);
      setFormState(prev => ({ ...prev, productIds: ids }));
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    Object.keys(formState).forEach(key => {
      if (typeof formState[key] === 'object') {
        if (key === 'productIds') formData.append(key, JSON.stringify(formState[key]));
        else {
            if(key === 'display') {
                formData.append('position', formState.display.position);
                formData.append('size', formState.display.size);
                formData.append('colorHex', formState.display.color);
            }
            if(key === 'urgency') {
                formData.append('urgencyType', formState.urgency.type);
                formData.append('urgencyMinutes', formState.urgency.minutes);
                // ✅ Send Urgency Color
                formData.append('urgencyColorHex', formState.urgency.color);
            }
        }
      } else {
        formData.append(key, formState[key]);
      }
    });
    
    formData.append("intent", "save");
    submit(formData, { method: "post" });
    setActiveModal(false);
  };

  const handleDelete = (id) => {
    if(confirm("Delete this timer?")) {
        const formData = new FormData();
        formData.append("intent", "delete");
        formData.append("id", id);
        submit(formData, { method: "post" });
    }
  };

  // Color Handler 1: Timer Color
  const handleTimerColorChange = (newColor) => {
    setTimerColor(newColor);
    setFormState(prev => ({ ...prev, display: { ...prev.display, color: `hsl(${newColor.hue}, 100%, 50%)` } }));
  };

  // Color Handler 2: Urgency Color
  const handleUrgencyColorChange = (newColor) => {
    setUrgencyColor(newColor);
    setFormState(prev => ({ ...prev, urgency: { ...prev.urgency, color: `hsl(${newColor.hue}, 100%, 50%)` } }));
  };

  const filteredTimers = timers.filter(t => t.title.toLowerCase().includes(searchValue.toLowerCase()));

  return (
    <Page fullWidth title="Countdown Timer Manager">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: '16px', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between' }}>
               <div style={{ width: '300px' }}>
                 <TextField value={searchValue} onChange={setSearchValue} prefix={<Icon source={SearchIcon} />} placeholder="Search timers..." autoComplete="off" />
               </div>
               <Button variant="primary" onClick={() => handleOpenModal(null)}>+ Create timer</Button>
            </div>

            {filteredTimers.length === 0 ? (
                <EmptyState heading="No timers found" image="" />
            ) : (
                <ResourceList
                    resourceName={{ singular: 'timer', plural: 'timers' }}
                    items={filteredTimers}
                    renderItem={(item) => {
                        const { _id, title, endDate, targetType } = item;
                        const isActive = new Date(endDate) > new Date();
                        return (
                            <ResourceItem id={_id} onClick={() => handleOpenModal(item)} accessibilityLabel={`Edit ${title}`}
                                media={ <div style={{background: isActive ? '#e3f1df' : '#fbeae5', padding: '5px', borderRadius: '4px'}}><Icon source={ClockIcon} /></div> }
                                shortcutActions={[{ content: 'Delete', destructive: true, onAction: () => handleDelete(_id) }]}
                            >
                                <InlineStack align="space-between">
                                    <BlockStack>
                                        <Text fontWeight="bold">{title}</Text>
                                        <Text tone="subdued">{targetType === 'all' ? 'All Products' : `${item.productIds?.length || 0} Products`}</Text>
                                    </BlockStack>
                                    <Badge tone={isActive ? "success" : "critical"}>{isActive ? "Active" : "Expired"}</Badge>
                                </InlineStack>
                            </ResourceItem>
                        );
                    }}
                />
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <Modal open={activeModal} onClose={() => setActiveModal(false)} title={formState.id ? "Edit Timer" : "Create New Timer"}
        primaryAction={{ content: "Save", onAction: handleSave, loading: isLoading }}
        secondaryActions={[{ content: "Cancel", onAction: () => setActiveModal(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Timer name *" value={formState.title} onChange={(v) => setFormState({...formState, title: v})} autoComplete="off" />
            
            <Text variant="headingSm">Schedule</Text>
            <Grid>
                <Grid.Cell columnSpan={{xs: 6}}><TextField label="Start date" type="date" value={formState.startDate} onChange={(v) => setFormState({...formState, startDate: v})} autoComplete="off" /></Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6}}><TextField label="Start time" type="time" value={formState.startTime} onChange={(v) => setFormState({...formState, startTime: v})} autoComplete="off" /></Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6}}><TextField label="End date" type="date" value={formState.endDate} onChange={(v) => setFormState({...formState, endDate: v})} autoComplete="off" /></Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6}}><TextField label="End time" type="time" value={formState.endTime} onChange={(v) => setFormState({...formState, endTime: v})} autoComplete="off" /></Grid.Cell>
            </Grid>

            <TextField label="Description" value={formState.description} onChange={(v) => setFormState({...formState, description: v})} multiline={2} autoComplete="off" />

            <Box paddingBlockStart="400">
                <BlockStack gap="200">
                    <Checkbox label="Apply to all products" checked={formState.targetType === 'all'} onChange={(c) => setFormState(prev => ({ ...prev, targetType: c ? 'all' : 'specific', productIds: [] }))} />
                    {formState.targetType === 'specific' && (
                        <InlineStack gap="200" align="start" blockAlign="center">
                            <Button onClick={handleProductSelect}>Select Products</Button>
                            <Text tone="subdued">{formState.productIds.length} selected</Text>
                        </InlineStack>
                    )}
                </BlockStack>
            </Box>

            <Text variant="headingSm">Appearance</Text>
            <Grid>
                <Grid.Cell columnSpan={{xs: 6}}>
                    <Select label="Position" options={['top', 'bottom']} value={formState.display.position} onChange={(v) => setFormState({...formState, display: {...formState.display, position: v}})} />
                    <div style={{marginTop: '10px'}}>
                        <Select label="Size" options={['small', 'medium', 'large']} value={formState.display.size} onChange={(v) => setFormState({...formState, display: {...formState.display, size: v}})} />
                    </div>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6}}>
                    <Text>Standard Color</Text>
                    <div style={{marginTop: '5px'}}><ColorPicker onChange={handleTimerColorChange} color={timerColor} allowAlpha={false} /></div>
                </Grid.Cell>
            </Grid>

            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <Text variant="headingSm">Urgency Settings</Text>
                <br/>
                <Grid>
                    <Grid.Cell columnSpan={{xs: 6}}>
                         <BlockStack gap="200">
                            <Select label="Type" options={[{label: 'None', value: 'none'}, {label: 'Pulse', value: 'pulse'}, {label: 'Banner', value: 'banner'}]} value={formState.urgency.type} onChange={(v) => setFormState({...formState, urgency: {...formState.urgency, type: v}})} />
                            {formState.urgency.type !== 'none' && (
                                <TextField type="number" label="Trigger (min left)" value={String(formState.urgency.minutes)} onChange={(v) => setFormState({...formState, urgency: {...formState.urgency, minutes: v}})} autoComplete="off" />
                            )}
                        </BlockStack>
                    </Grid.Cell>
                    {formState.urgency.type !== 'none' && (
                        <Grid.Cell columnSpan={{xs: 6}}>
                            <Text>Warning Color</Text>
                            <div style={{marginTop: '5px'}}><ColorPicker onChange={handleUrgencyColorChange} color={urgencyColor} allowAlpha={false} /></div>
                        </Grid.Cell>
                    )}
                </Grid>
            </Box>

          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}