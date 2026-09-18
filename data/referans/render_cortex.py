import bpy
import mathutils
import os

BASE = "/Users/sinancanan/Desktop/CLAUDE/Beyin3D/_zanatomy_incele"

with open(os.path.join(BASE, "cortex_objects.txt"), encoding="utf-8") as f:
    keep_names = set(line.strip() for line in f if line.strip())

# lobe color groups (base name without .l/.r suffix -> RGBA)
LOBE_COLORS = {
    "Precentral gyrus": (0.25, 0.45, 0.9, 1.0),
    "Opercular part of inferior frontal gyrus": (0.25, 0.45, 0.9, 1.0),
    "Triangular part of inferior frontal gyrus": (0.25, 0.45, 0.9, 1.0),
    "Orbital gyri": (0.25, 0.45, 0.9, 1.0),

    "Postcentral gyrus": (0.2, 0.75, 0.35, 1.0),
    "Angular gyrus": (0.2, 0.75, 0.35, 1.0),
    "Supramarginal gyrus": (0.2, 0.75, 0.35, 1.0),
    "Superior parietal lobule": (0.2, 0.75, 0.35, 1.0),
    "Precuneus": (0.2, 0.75, 0.35, 1.0),

    "Superior temporal gyrus (Lateral part)": (0.95, 0.7, 0.15, 1.0),
    "Middle temporal gyrus": (0.95, 0.7, 0.15, 1.0),
    "Inferior temporal gyrus": (0.95, 0.7, 0.15, 1.0),
    "Temporal pole": (0.95, 0.7, 0.15, 1.0),
    "Transverse temporal gyri": (0.95, 0.7, 0.15, 1.0),
    "Lateral occipitotemporal gyrus": (0.95, 0.7, 0.15, 1.0),
    "Medial occipitotemporal gyrus (Parahippocampal*)": (0.95, 0.7, 0.15, 1.0),

    "Cuneus": (0.6, 0.3, 0.85, 1.0),
    "Lingual gyrus": (0.6, 0.3, 0.85, 1.0),
    "Lateral occipital gyrus (Middle occipital gyrus*)": (0.6, 0.3, 0.85, 1.0),

    "Cingulate gyrus (Posteroventral part*)": (0.9, 0.3, 0.4, 1.0),
    "Cingulate gyrus and sulcus (Middle anterior part)": (0.9, 0.3, 0.4, 1.0),
    "Cingulate gyrus and sulcus (Middle posterior part)": (0.9, 0.3, 0.4, 1.0),
    "Cingulate gyrus and sulcus (Posterior dorsal part)": (0.9, 0.3, 0.4, 1.0),
}

def base_name(name):
    for suf in (".l", ".r", ".g", ".j", ".t", ".i", ".s"):
        if name.endswith(suf):
            return name[: -len(suf)]
    return name

scene = bpy.context.scene

def unhide_collections(coll):
    coll.hide_render = False
    coll.hide_viewport = False
    for c in coll.children:
        unhide_collections(c)

unhide_collections(scene.collection)
for lc in scene.view_layers[0].layer_collection.children:
    pass

def enable_layer_collections(layer_coll):
    layer_coll.exclude = False
    layer_coll.hide_viewport = False
    for c in layer_coll.children:
        enable_layer_collections(c)

enable_layer_collections(scene.view_layers[0].layer_collection)

kept = []
for obj in bpy.data.objects:
    if obj.type != "MESH":
        obj.hide_render = True
        continue
    if obj.name in keep_names:
        obj.hide_render = False
        obj.hide_viewport = False
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        scene.collection.objects.link(obj)
        bcol = LOBE_COLORS.get(base_name(obj.name), (0.85, 0.75, 0.7, 1.0))
        obj.color = bcol
        mat = bpy.data.materials.new(name=f"mat_{obj.name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf is not None:
            bsdf.inputs["Base Color"].default_value = bcol
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.6
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        kept.append(obj)
    else:
        obj.hide_render = True
        obj.hide_viewport = True

print(f"Görünür bırakılan mesh sayısı: {len(kept)} / istenen {len(keep_names)}")
missing = keep_names - set(o.name for o in kept)
if missing:
    print("BULUNAMAYAN OBJELER:", missing)

scene.render.engine = "BLENDER_EEVEE"
scene.render.use_freestyle = False
scene.render.use_compositing = False
scene.use_nodes = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0
scene.view_settings.look = "None"

# compute bounding box of kept objects (world space)
import mathutils
min_co = mathutils.Vector((1e9, 1e9, 1e9))
max_co = mathutils.Vector((-1e9, -1e9, -1e9))
for obj in kept:
    for corner in obj.bound_box:
        world_co = obj.matrix_world @ mathutils.Vector(corner)
        min_co.x = min(min_co.x, world_co.x)
        min_co.y = min(min_co.y, world_co.y)
        min_co.z = min(min_co.z, world_co.z)
        max_co.x = max(max_co.x, world_co.x)
        max_co.y = max(max_co.y, world_co.y)
        max_co.z = max(max_co.z, world_co.z)

center = (min_co + max_co) / 2
size = max_co - min_co
radius = max(size.x, size.y, size.z)
print("Center:", center, "Size:", size)

# remove existing cameras/lights to avoid clutter, add our own
for obj in list(bpy.data.objects):
    if obj.type in ("CAMERA", "LIGHT"):
        bpy.data.objects.remove(obj, do_unlink=True)

cam_data = bpy.data.cameras.new("PreviewCam")
cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# position camera at 3/4 angle, front-left-above
direction = mathutils.Vector((1.0, -1.6, 0.6)).normalized()
distance = radius * 2.4
cam_obj.location = center + direction * distance
look_dir = (center - cam_obj.location).normalized()
rot_quat = look_dir.to_track_quat("-Z", "Y")
cam_obj.rotation_euler = rot_quat.to_euler()
cam_data.lens = 50

light_data = bpy.data.lights.new("PreviewSun", type="SUN")
light_data.energy = 4.0
light_obj = bpy.data.objects.new("PreviewSun", light_data)
scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (0.9, 0.2, 0.6)

light_data2 = bpy.data.lights.new("PreviewFill", type="SUN")
light_data2.energy = 2.0
light_obj2 = bpy.data.objects.new("PreviewFill", light_data2)
scene.collection.objects.link(light_obj2)
light_obj2.rotation_euler = (-0.6, -0.3, -2.2)

scene.render.resolution_x = 1600
scene.render.resolution_y = 1200
scene.render.film_transparent = False

world = scene.world
if world is None:
    world = bpy.data.worlds.new("PreviewWorld")
    scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg is not None:
    bg.inputs["Color"].default_value = (0.9, 0.9, 0.92, 1.0)
    bg.inputs["Strength"].default_value = 1.0

out_path = os.path.join(BASE, "cortex_preview.png")
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("Render yazildi:", out_path)
