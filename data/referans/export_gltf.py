import bpy
import json
import os

BASE = "/Users/sinancanan/Desktop/CLAUDE/Beyin3D"

with open(os.path.join(BASE, "data", "_export_list.json"), encoding="utf-8") as f:
    plan = json.load(f)

export_map = plan["export"]  # region_id -> [zanatomy object names]

depsgraph = bpy.context.evaluated_depsgraph_get()

# fresh output collection, unlinked from the messy original hierarchy
out_coll = bpy.data.collections.new("Beyin3D_Export")
bpy.context.scene.collection.children.link(out_coll)

report_ok = []
report_missing_src = []

for region_id, src_names in export_map.items():
    dup_objs = []
    missing_here = []
    for src_name in src_names:
        src = bpy.data.objects.get(src_name)
        if src is None:
            missing_here.append(src_name)
            continue
        eval_obj = src.evaluated_get(depsgraph)
        mesh_data = bpy.data.meshes.new_from_object(eval_obj)
        dup = bpy.data.objects.new(f"{region_id}__part", mesh_data)
        dup.matrix_world = src.matrix_world.copy()
        out_coll.objects.link(dup)
        dup_objs.append(dup)

    if missing_here:
        report_missing_src.append((region_id, missing_here))

    if not dup_objs:
        continue

    # deselect everything, select just our parts, join into the first
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in dup_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = dup_objs[0]

    if len(dup_objs) > 1:
        bpy.ops.object.join()

    final_obj = bpy.context.view_layer.objects.active
    # bake remaining transform into vertex data so the exported object sits at identity transform
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    final_obj.name = region_id
    final_obj.data.name = region_id

    report_ok.append((region_id, len(src_names)))

print(f"\n=== TOPLAM ISLENEN BOLGE: {len(report_ok)} ===")
if report_missing_src:
    print("=== KAYNAK OBJESI BULUNAMAYAN (kismi) ===")
    for rid, names in report_missing_src:
        print(f"  {rid}: {names}")

# select only our final export collection's objects for a scoped glTF export
for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o in out_coll.objects:
    o.select_set(True)

out_path = os.path.join(BASE, "_pipeline", "beyin-bolgeleri.glb")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
)
print("glTF yazildi:", out_path)
print("Cikti nesne sayisi:", len(out_coll.objects))
