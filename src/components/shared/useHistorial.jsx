import { api } from "@/api/client";

const IGNORED_FIELDS = ["id", "created_date", "updated_date", "created_by"];

/**
 * Saves history entries for changed fields between oldData and newData.
 */
export async function saveHistorialChanges({ entityType, entityId, entityLabel, oldData, newData, userEmail }) {
  const now = new Date().toISOString();
  const entries = [];
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    if (IGNORED_FIELDS.includes(key)) continue;
    const oldVal = oldData?.[key];
    const newVal = newData?.[key];
    const oldStr = Array.isArray(oldVal) ? oldVal.join(", ") : String(oldVal ?? "");
    const newStr = Array.isArray(newVal) ? newVal.join(", ") : String(newVal ?? "");
    if (oldStr !== newStr) {
      entries.push({
        entity_type: entityType,
        entity_id: entityId,
        entity_label: entityLabel,
        field: key,
        old_value: oldStr,
        new_value: newStr,
        modified_by: userEmail,
        modified_at: now,
        action: "actualizado",
      });
    }
  }

  if (entries.length > 0) {
    await api.entities.Historial.bulkCreate(entries);
  }
}

/**
 * Saves a single "creado" history entry.
 */
export async function saveHistorialCreated({ entityType, entityId, entityLabel, userEmail }) {
  await api.entities.Historial.create({
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    action: "creado",
    modified_by: userEmail,
    modified_at: new Date().toISOString(),
  });
}