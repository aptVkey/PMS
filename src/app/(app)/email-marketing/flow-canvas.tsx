"use client";

import "@xyflow/react/dist/style.css";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  type OnConnectEnd,
} from "@xyflow/react";
import {
  AlertTriangle,
  CalendarPlus,
  Clock,
  Mail,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import type { Property } from "@/lib/property";
import {
  TRIGGER_TYPE_LABELS,
  TRIGGER_TYPES,
  describeTrigger,
  formatMinutes,
  resolveEffectiveTrigger,
  type EmailFlowStep,
  type EmailList,
  type EmailTemplate,
  type TriggerType,
} from "@/lib/email-marketing";
import { ToggleSwitch } from "@/components/toggle-switch";
import {
  createFlowNode,
  moveFlowNodes,
  reparentFlowNode,
  setFlowStepActive,
} from "./actions";
import { EmailInspector, TriggerInspector } from "./flow-node-inspector";

const NODE_WIDTH = 264;
const COLUMN_GAP = 310;
const ROW_GAP = 200;
const TRIGGER_OFFSET_Y = 130;
const DRAG_MIME = "application/reactflow";

const TRIGGER_ICONS: Record<TriggerType, LucideIcon> = {
  booking_created: CalendarPlus,
  booking_status: RefreshCw,
  date_offset: Clock,
  cleaning_completed: Sparkles,
  cleaning_ready_on_checkin: KeyRound,
};

type TriggerNodeData = {
  stepId: string;
  triggerType: TriggerType | null;
  summary: string;
  muted: boolean;
};

type EmailNodeData = {
  stepId: string;
  templateName: string | null;
  isRoot: boolean;
  delayLabel: string | null;
  filters: string[];
  active: boolean;
  // Desativado por um passo anterior (ele próprio está ativo).
  pausedByParent: boolean;
  sent: number;
  onToggle: (stepId: string, next: boolean) => void;
  onAddChild: (stepId: string) => void;
};

type TriggerFlowNode = Node<TriggerNodeData, "trigger">;
type EmailFlowNode = Node<EmailNodeData, "email">;
type CanvasNode = TriggerFlowNode | EmailFlowNode;

const triggerNodeId = (stepId: string) => `t:${stepId}`;
const isTriggerNodeId = (id: string) => id.startsWith("t:");
const stepIdFromNodeId = (id: string) =>
  isTriggerNodeId(id) ? id.slice(2) : id;

// ---------- Nós ----------

function TriggerNodeView({ data, selected }: NodeProps<TriggerFlowNode>) {
  const Icon = data.triggerType ? TRIGGER_ICONS[data.triggerType] : Zap;

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`flex items-center gap-3 rounded-lg border-2 bg-primary/5 px-4 py-3 shadow-card transition-opacity ${
        selected ? "border-action" : "border-primary/40"
      } ${data.muted ? "opacity-60" : ""}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-subdued">
          Gatilho
        </p>
        <p className="text-[13px] font-semibold leading-tight text-ink">
          {data.summary}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-2 !w-2 !border-primary !bg-primary"
      />
    </div>
  );
}

function EmailNodeView({ data, selected }: NodeProps<EmailFlowNode>) {
  const effectivelyActive = data.active && !data.pausedByParent;

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`rounded-lg border-2 bg-canvas shadow-card transition-opacity ${
        selected ? "border-action" : "border-border"
      } ${effectivelyActive ? "" : "border-dashed opacity-70"}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-ink-subdued"
      />

      <div className="flex flex-col gap-2 px-4 pt-3">
        {data.delayLabel && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-ink-subdued">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {data.delayLabel}
          </p>
        )}
        <div className="flex items-start gap-2">
          <Mail
            className="mt-0.5 h-4 w-4 shrink-0 text-ink-subdued"
            strokeWidth={2}
          />
          {data.templateName ? (
            <p className="min-w-0 text-body font-bold leading-tight text-ink">
              {data.templateName}
            </p>
          ) : (
            <p className="flex min-w-0 items-center gap-1 text-body font-bold leading-tight text-highlight-ink">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
              Escolher modelo
            </p>
          )}
        </div>
        {data.filters.length > 0 && (
          <p className="text-[12px] text-ink-subdued">
            {data.filters.join(" · ")}
          </p>
        )}
      </div>

      <div className="nodrag nopan mt-3 flex items-center justify-between gap-2 border-t border-border px-4 py-2">
        <ToggleSwitch
          label={`Etapa ${data.templateName ?? "sem modelo"}`}
          checked={data.active}
          onChange={() => data.onToggle(data.stepId, !data.active)}
        />
        <span className="text-[12px] text-ink-subdued">
          {data.sent} enviado(s)
        </span>
      </div>

      {data.pausedByParent && data.active && (
        <p className="border-t border-border px-4 py-1.5 text-[11px] text-ink-subdued">
          Pausado: um passo anterior está desativado.
        </p>
      )}

      <button
        type="button"
        onClick={() => data.onAddChild(data.stepId)}
        className="nodrag nopan flex w-full items-center justify-center gap-1.5 rounded-b-md border-t border-border bg-surface-1 px-4 py-2 text-[12px] font-semibold text-ink-muted transition-colors duration-fast ease-standard hover:bg-surface-2"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Adicionar email seguinte
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-action"
      />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNodeView,
  email: EmailNodeView,
} satisfies NodeTypes;

// Quando um passo seguinte envia: gatilho próprio ou espera após o anterior.
function stepTimingLabel(step: EmailFlowStep): string {
  if (step.trigger_type) return describeTrigger(step);
  if (step.offset_minutes > 0) {
    return `Aguardar ${formatMinutes(step.offset_minutes)}`;
  }
  return "Logo a seguir";
}

// ---------- Posições automáticas ----------

// Posição por defeito de passos sem posição guardada: cada ramo ocupa uma
// coluna, os passos seguintes ficam por baixo do anterior.
function autoLayout(steps: EmailFlowStep[]) {
  const ids = new Set(steps.map((s) => s.id));
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  const children = new Map<string | null, EmailFlowStep[]>();

  for (const step of ordered) {
    const key =
      step.parent_step_id && ids.has(step.parent_step_id)
        ? step.parent_step_id
        : null;
    children.set(key, [...(children.get(key) ?? []), step]);
  }

  const out = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  let leaf = 0;

  function place(step: EmailFlowStep, depth: number): number {
    visited.add(step.id);
    const kids = (children.get(step.id) ?? []).filter(
      (k) => !visited.has(k.id),
    );
    let x: number;

    if (kids.length === 0) {
      x = leaf * COLUMN_GAP;
      leaf += 1;
    } else {
      const xs = kids.map((k) => place(k, depth + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }

    out.set(step.id, { x, y: TRIGGER_OFFSET_Y + depth * ROW_GAP });
    return x;
  }

  for (const root of children.get(null) ?? []) {
    if (!visited.has(root.id)) place(root, 0);
  }

  return out;
}

// ---------- Canvas ----------

type Props = {
  flowId: string;
  steps: EmailFlowStep[];
  sendCounts: Record<string, number>;
  templates: EmailTemplate[];
  lists: EmailList[];
  properties: Property[];
};

function FlowCanvasInner({
  flowId,
  steps,
  sendCounts,
  templates,
  lists,
  properties,
}: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [measured, setMeasured] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepsById = useMemo(
    () => new Map(steps.map((s) => [s.id, s])),
    [steps],
  );
  const templateById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates],
  );
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const propertyById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const runAction = useCallback(
    (task: () => Promise<{ error: string } | { success: true }>) => {
      setActionError(null);
      startTransition(async () => {
        const result = await task();
        if ("error" in result) setActionError(result.error);
      });
    },
    [],
  );

  const handleToggle = useCallback(
    (stepId: string, next: boolean) => {
      runAction(() => setFlowStepActive(stepId, next));
    },
    [runAction],
  );

  // Cria um passo e seleciona-o assim que a base de dados responde.
  const createNode = useCallback(
    (input: {
      parentStepId: string | null;
      triggerType?: TriggerType;
      x: number;
      y: number;
    }) => {
      setActionError(null);
      startTransition(async () => {
        const result = await createFlowNode({ flowId, ...input });
        if ("error" in result) {
          setActionError(result.error);
          return;
        }
        setSelectedId(
          input.parentStepId ? result.id : triggerNodeId(result.id),
        );
      });
    },
    [flowId],
  );

  const autoPositions = useMemo(() => autoLayout(steps), [steps]);

  const positionOf = useCallback(
    (step: EmailFlowStep) => {
      const dragged = positions[step.id];
      if (dragged) return dragged;
      if (step.pos_x !== null && step.pos_y !== null) {
        return { x: step.pos_x, y: step.pos_y };
      }
      return autoPositions.get(step.id) ?? { x: 0, y: TRIGGER_OFFSET_Y };
    },
    [positions, autoPositions],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = stepsById.get(parentId);
      if (!parent) return;
      const base = positionOf(parent);
      const siblings = steps.filter((s) => s.parent_step_id === parentId);
      createNode({
        parentStepId: parentId,
        x: base.x + siblings.length * COLUMN_GAP,
        y: base.y + ROW_GAP,
      });
    },
    [stepsById, steps, positionOf, createNode],
  );

  const { nodes, edges } = useMemo(() => {
    const builtNodes: CanvasNode[] = [];
    const builtEdges: Edge[] = [];

    for (const step of steps) {
      const effective = resolveEffectiveTrigger(step, stepsById);
      const ownPosition = positionOf(step);
      const isRoot = step.parent_step_id === null;
      const parent = step.parent_step_id
        ? stepsById.get(step.parent_step_id)
        : null;
      const parentResolved = parent
        ? resolveEffectiveTrigger(parent, stepsById)
        : null;
      const pausedByParent = Boolean(
        step.is_active &&
        effective &&
        !effective.active &&
        parentResolved &&
        !parentResolved.active,
      );

      const filters: string[] = [];
      if (step.property_id) {
        filters.push(propertyById.get(step.property_id)?.name ?? "Alojamento");
      }
      if (step.list_id) {
        filters.push(`Lista: ${listById.get(step.list_id)?.name ?? "?"}`);
      }

      builtNodes.push({
        id: step.id,
        type: "email",
        position: ownPosition,
        measured: measured[step.id],
        selected: selectedId === step.id,
        data: {
          stepId: step.id,
          templateName: step.template_id
            ? (templateById.get(step.template_id)?.name ?? "Modelo removido")
            : null,
          isRoot,
          delayLabel: isRoot ? null : stepTimingLabel(step),
          filters,
          active: step.is_active,
          pausedByParent,
          sent: sendCounts[step.id] ?? 0,
          onToggle: handleToggle,
          onAddChild: handleAddChild,
        },
      });

      const muted = !(effective?.active ?? step.is_active);

      if (isRoot) {
        const triggerId = triggerNodeId(step.id);
        builtNodes.push({
          id: triggerId,
          type: "trigger",
          position: {
            x: ownPosition.x,
            y: ownPosition.y - TRIGGER_OFFSET_Y,
          },
          measured: measured[triggerId],
          selected: selectedId === triggerId,
          draggable: false,
          data: {
            stepId: step.id,
            triggerType: step.trigger_type,
            summary: describeTrigger(step),
            muted,
          },
        });
        builtEdges.push({
          id: `e:${triggerId}->${step.id}`,
          source: triggerId,
          target: step.id,
          style: { stroke: "var(--color-primary)", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed },
          selectable: false,
          deletable: false,
        });
      } else if (parent) {
        builtEdges.push({
          id: `e:${parent.id}->${step.id}`,
          source: parent.id,
          target: step.id,
          animated: !muted,
          label: stepTimingLabel(step).toLowerCase(),
          labelStyle: { fontSize: 11, fontWeight: 600 },
          style: {
            strokeWidth: 2,
            strokeDasharray: muted ? "5 5" : undefined,
            opacity: muted ? 0.5 : 1,
          },
          markerEnd: { type: MarkerType.ArrowClosed },
          selectable: false,
          deletable: false,
        });
      }
    }

    return { nodes: builtNodes, edges: builtEdges };
  }, [
    steps,
    stepsById,
    positionOf,
    measured,
    selectedId,
    sendCounts,
    templateById,
    listById,
    propertyById,
    handleToggle,
    handleAddChild,
  ]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        const { id, position } = change;
        if (!isTriggerNodeId(id)) {
          setPositions((prev) => ({ ...prev, [id]: position }));
        }
      }
      if (change.type === "dimensions" && change.dimensions) {
        const { id, dimensions } = change;
        setMeasured((prev) => {
          const current = prev[id];
          if (
            current &&
            current.width === dimensions.width &&
            current.height === dimensions.height
          ) {
            return prev;
          }
          return { ...prev, [id]: dimensions };
        });
      }
    }
  }, []);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;
      runAction(() => reparentFlowNode(connection.target, connection.source));
    },
    [runAction],
  );

  // Só se liga um email a outro email (nunca ao gatilho, nem a si próprio).
  const isValidConnection: IsValidConnection = useCallback(
    (connection) =>
      !isTriggerNodeId(connection.source) &&
      !isTriggerNodeId(connection.target) &&
      connection.source !== connection.target,
    [],
  );

  // Largar uma ligação em espaço vazio cria um novo email seguinte aí.
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      const fromId = connectionState.fromNode?.id;
      if (!fromId || isTriggerNodeId(fromId)) return;

      const point =
        "changedTouches" in event
          ? event.changedTouches[0]
          : (event as MouseEvent);
      const position = screenToFlowPosition({
        x: point.clientX,
        y: point.clientY,
      });
      createNode({
        parentStepId: fromId,
        x: position.x - NODE_WIDTH / 2,
        y: position.y,
      });
    },
    [screenToFlowPosition, createNode],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_MIME) as TriggerType;
      if (!TRIGGER_TYPES.includes(type)) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      createNode({
        parentStepId: null,
        triggerType: type,
        x: position.x - NODE_WIDTH / 2,
        y: position.y + TRIGGER_OFFSET_Y,
      });
    },
    [screenToFlowPosition, createNode],
  );

  // Alternativa ao arrastar (toque, teclado): clicar no gatilho da paleta
  // coloca-o à direita do último ramo.
  const addTriggerFromPalette = useCallback(
    (type: TriggerType) => {
      const roots = steps.filter((s) => s.parent_step_id === null);
      const rightmost = roots.reduce(
        (max, s) => Math.max(max, positionOf(s).x),
        -COLUMN_GAP,
      );
      createNode({
        parentStepId: null,
        triggerType: type,
        x: roots.length === 0 ? 0 : rightmost + COLUMN_GAP,
        y: TRIGGER_OFFSET_Y,
      });
    },
    [steps, positionOf, createNode],
  );

  const selectedStep = selectedId
    ? (stepsById.get(stepIdFromNodeId(selectedId)) ?? null)
    : null;

  const descendantCount = useMemo(() => {
    if (!selectedStep) return 0;
    let count = 0;
    const queue = [selectedStep.id];
    const seen = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const s of steps) {
        if (s.parent_step_id === current && !seen.has(s.id)) {
          seen.add(s.id);
          count += 1;
          queue.push(s.id);
        }
      }
    }
    return count;
  }, [selectedStep, steps]);

  const parentLabel = useMemo(() => {
    if (!selectedStep?.parent_step_id) return null;
    const parent = stepsById.get(selectedStep.parent_step_id);
    if (!parent) return null;
    return parent.template_id
      ? (templateById.get(parent.template_id)?.name ?? "Modelo removido")
      : "Email sem modelo";
  }, [selectedStep, stepsById, templateById]);

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p
          aria-live="polite"
          className="rounded-md bg-error/10 px-3 py-2 text-body text-error"
        >
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-3 lg:h-[calc(100vh-20rem)] lg:min-h-[520px] lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-canvas p-3 shadow-card lg:w-56">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-subdued">
            Gatilhos
          </p>
          <p className="text-[12px] text-ink-subdued">
            Arrasta para o canvas ou clica para adicionar.
          </p>
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TRIGGER_TYPES.map((type) => {
              const Icon = TRIGGER_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  draggable
                  disabled={isPending}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_MIME, type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => addTriggerFromPalette(type)}
                  className="flex min-h-11 shrink-0 cursor-grab items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-left text-[13px] font-semibold text-ink transition-colors duration-fast ease-standard hover:border-action hover:bg-surface-2 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-primary"
                    strokeWidth={2}
                  />
                  {TRIGGER_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[12px] text-ink-subdued">
            Depois de um gatilho, usa «Adicionar email seguinte» (ou arrasta a
            bolinha de baixo do email para um espaço vazio) para encadear
            emails.
          </p>
        </aside>

        <div className="relative h-[480px] min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface-1 lg:h-auto">
          <ReactFlow<CanvasNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            isValidConnection={isValidConnection}
            onNodeClick={(_event, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            onNodeDragStop={(_event, node) => {
              if (isTriggerNodeId(node.id)) return;
              runAction(() =>
                moveFlowNodes([
                  { id: node.id, x: node.position.x, y: node.position.y },
                ]),
              );
            }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {steps.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="flex max-w-xs flex-col items-center gap-2">
                <Zap className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
                <p className="text-body font-semibold text-ink">
                  Começa por um gatilho
                </p>
                <p className="text-body text-ink-subdued">
                  Arrasta um gatilho da paleta para aqui, ou clica nele.
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedStep &&
          (selectedId && isTriggerNodeId(selectedId) ? (
            <TriggerInspector
              key={selectedStep.id}
              step={selectedStep}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <EmailInspector
              key={selectedStep.id}
              step={selectedStep}
              descendantCount={descendantCount}
              parentLabel={parentLabel}
              templates={templates}
              lists={lists}
              properties={properties}
              onClose={() => setSelectedId(null)}
            />
          ))}
      </div>
    </div>
  );
}

export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
