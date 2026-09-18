import bpy
import json
import os
import mathutils

BASE = "/Users/sinancanan/Desktop/CLAUDE/Beyin3D"

# clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, "_pipeline", "beyin-bolgeleri.glb"))

with open(os.path.join(BASE, "data", "beyin-bolgeleri.json"), encoding="utf-8") as f:
    regions = {r["id"]: r for r in json.load(f)["regions"]}

CATEGORY_COLORS = {
    "sistem": (0.8, 0.8, 0.8, 1.0),
    "lob": (0.55, 0.6, 0.95, 1.0),
    "korteks-alani": (0.35, 0.55, 0.9, 1.0),
    "cekirdek": (0.9, 0.35, 0.35, 1.0),
    "yapi": (0.95, 0.75, 0.25, 1.0),
    "beyaz-cevher": (0.9, 0.9, 0.9, 1.0),
    "bosluk": (0.3, 0.8, 0.9, 1.0),
    "grup": (0.6, 0.6, 0.6, 1.0),
    "kraniyal-sinir": (0.9, 0.6, 0.9, 1.0),
}

mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
print("Imported mesh count:", len(mesh_objs))

for obj in mesh_objs:
    region = regions.get(obj.name)
    col = CATEGORY_COLORS.get(region["category"], (0.8, 0.75, 0.7, 1.0)) if region else (1, 0, 1, 1)
    mat = bpy.data.materials.new(name=f"mat_{obj.name}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = 0.6
    obj.data.materials.clear()
    obj.data.materials.append(mat)

scene.render.engine = "BLENDER_EEVEE"
scene.render.use_freestyle = False
scene.render.use_compositing = False
scene.use_nodes = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0

# bounding box of the core brain only (exclude long cranial nerves trailing into the body)
bbox_objs = [
    o for o in mesh_objs
    if regions.get(o.name, {}).get("category") not in ("kraniyal-sinir",)
]
min_co = mathutils.Vector((1e9, 1e9, 1e9))
max_co = mathutils.Vector((-1e9, -1e9, -1e9))
for obj in bbox_objs:
    for corner in obj.bound_box:
        wc = obj.matrix_world @ mathutils.Vector(corner)
        min_co.x, min_co.y, min_co.z = min(min_co.x, wc.x), min(min_co.y, wc.y), min(min_co.z, wc.z)
        max_co.x, max_co.y, max_co.z = max(max_co.x, wc.x), max(max_co.y, wc.y), max(max_co.z, wc.z)
center = (min_co + max_co) / 2
size = max_co - min_co
radius = max(size.x, size.y, size.z)
print("Center:", center, "Size:", size)

cam_data = bpy.data.cameras.new("Cam")
cam_obj = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj
direction = mathutils.Vector((1.0, -1.6, 0.5)).normalized()
distance = radius * 2.2
cam_obj.location = center + direction * distance
look_dir = (center - cam_obj.location).normalized()
cam_obj.rotation_euler = look_dir.to_track_quat("-Z", "Y").to_euler()
cam_data.lens = 50

sun1 = bpy.data.lights.new("Sun1", type="SUN")
sun1.energy = 4.0
sun1_obj = bpy.data.objects.new("Sun1", sun1)
scene.collection.objects.link(sun1_obj)
sun1_obj.rotation_euler = (0.9, 0.2, 0.6)

sun2 = bpy.data.lights.new("Sun2", type="SUN")
sun2.energy = 2.0
sun2_obj = bpy.data.objects.new("Sun2", sun2)
scene.collection.objects.link(sun2_obj)
sun2_obj.rotation_euler = (-0.6, -0.3, -2.2)

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.92, 0.92, 0.94, 1.0)
bg.inputs["Strength"].default_value = 1.0

scene.render.resolution_x = 1800
scene.render.resolution_y = 1350
out_path = os.path.join(BASE, "_pipeline", "final_preview.png")
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("Render yazildi:", out_path)
