//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function startViewer(height, id, views) {
	if (views.length == 0) {
		return
	}
	var canvas = document.getElementById(id)
	canvas.height = height
	var context = canvas.getContext('2d')
 	var view = views[0]
	var mesh = view.mesh
	var facets = mesh.facets
	var points = mesh.points
	var meshBoundingBox = getMeshBoundingBox(mesh)
	for (facet of facets) {
		for (var vertexIndexIndex = 0; vertexIndexIndex < facet.length; vertexIndexIndex++) {
			var vertexIndex = facet[vertexIndexIndex]
			var point = points[vertexIndex]
			if (vertexIndexIndex == 0) {
				context.moveTo(point[0], point[1])
			}
			else {
				context.lineTo(point[0], point[1])
			}
		}
		context.stroke()
	}
}

function MeshViewer(id) {
	this.id = id
	this.views = []
	this.addMesh = function(matrix3D, mesh) {this.views.push({matrix3D:matrix3D, mesh:mesh})}
	this.start = function(height) {startViewer(height, this.id, this.views)}
}
