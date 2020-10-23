//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function setViewSelect(selectedIndex, views, viewSelectID) {
	var viewSelect = document.getElementById(viewSelectID)
	viewSelect.hidden = false
	for (view of views) {
		var option = document.createElement('option')
		option.text = view.id
		viewSelect.add(option)
	}
	viewSelect.selectedIndex = selectedIndex
}

function viewerMouseDown(event) {
	if (meshViewer.view == null) {
		return
	}
	meshViewer.mouseDown = [event.offsetX, event.offsetY]
	meshViewer.isCircle = false
	meshViewer.beginModelHandlesPath()
	meshViewer.isHandle = meshViewer.context.isPointInPath(event.offsetX, event.offsetY)
	if (meshViewer.isHandle) {
		meshViewer.mouseDownNegative = meshViewer.getOffsetNormal(event)
		meshViewer.mouseDownNegative[1] = -meshViewer.mouseDownNegative[1]
	}
	else {
		meshViewer.beginModelCirclePath()
		meshViewer.isCircle = meshViewer.context.isPointInPath(event.offsetX, event.offsetY)
	}
	meshViewer.view.lastRotationMatrix = meshViewer.view.rotationMatrix
}

function viewerMouseMove(event) {
	meshViewer.mouseMoved(event)
}

function viewerMouseOut(event) {
	meshViewer.mouseDown = null
	meshViewer.view.rotationMatrix = meshViewer.view.lastRotationMatrix
	meshViewer.draw()
}

function viewerMouseUp(event) {
	meshViewer.mouseMoved(event)
	meshViewer.mouseDown = null
	meshViewer.view.lastRotationMatrix = meshViewer.view.rotationMatrix
	meshViewer.drawModelControlPath(event)
}

function viewSelectChanged() {
	var viewSelect = document.getElementById(meshViewer.viewSelectID)
	meshViewer.setView(viewSelect.selectedIndex)
	meshViewer.draw()
}

var meshViewer = {
	initialize: function(id, viewSelectID) {
		this.id = id
		this.view = null
		this.views = []
		this.viewSelectID = viewSelectID
		this.mouseDown = null
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.doubleTextSpace = this.textSpace + this.textSpace
	},
	addMesh: function(id, matrix3D, mesh) {
		this.views.push({id:id, matrix3D:matrix3D, mesh:mesh, rotationMatrix:null})
	},
	beginModelCirclePath: function() {
		this.context.beginPath()
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, 0, Math.PI + Math.PI)
	},
	beginModelHandlesPath: function() {
		this.context.beginPath()
		this.context.moveTo(this.halfWidth + this.modelRadiusHandle, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusHandle, 0, Math.PI + Math.PI)
		this.context.moveTo(this.halfWidth + this.modelRadiusCircle, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, Math.PI + Math.PI, 0, true)
		this.context.closePath()
	},
	draw: function() {
		if (this.view == null) {
			return
		}
		var mesh = this.view.mesh
		var facets = mesh.facets
		var points = mesh.points
		var zPolygons = new Array(facets.length)
		var centerRotationMatrix = getMultiplied3DMatrix(this.view.rotationMatrix, this.view.scaleCenterMatrix)
		centerRotationMatrix = getMultiplied3DMatrix(this.canvasCenterMatrix, centerRotationMatrix)
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
		for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
			var facet = facets[facetIndex]
			var zPolygon = new Array(2)
			zPolygon[0] = new Array(facet.length)
			zPolygon[1] = new Array(facet.length)
			for (var vertexIndexIndex = 0; vertexIndexIndex < facet.length; vertexIndexIndex++) {
				var vertexIndex = facet[vertexIndexIndex]
				var point = getXYZBy3DMatrix(points[vertexIndex], centerRotationMatrix)
				zPolygon[0][vertexIndexIndex] = point[2]
				zPolygon[1][vertexIndexIndex] = [point[0], point[1]]
			}
			zPolygon[0].sort(compareNumberDescending)
			zPolygons[facetIndex] = zPolygon
		}
		zPolygons.sort(compareArrayDescending)
		var lineWidthOverPolygonsLength = 5.0 / zPolygons.length
		this.context.strokeStyle = 'black'
		for (var zPolygonIndex = 0; zPolygonIndex < zPolygons.length; zPolygonIndex++) {
			var zPolygon = zPolygons[zPolygonIndex]
			this.context.beginPath()
			for (point of zPolygon[1]) {
				if (vertexIndexIndex == 0) {
					this.moveToXY(point)
				}
				else {
					this.lineToXY(point)
				}
			}
			this.context.closePath()
			this.context.lineWidth = Math.floor(lineWidthOverPolygonsLength * zPolygonIndex) + 1
 			this.context.stroke()
			this.context.fill()
		}
	},
	drawModelControlPath: function(event) {
		this.beginModelCirclePath()
		if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
			this.beginModelHandlesPath()
			this.erasePath()
			this.beginModelCirclePath()
			this.drawPath()
			return
		}
		this.beginModelHandlesPath()
		if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
			this.drawPath()
			return
		}
		this.erasePath()
	},
	drawPath: function() {
		this.context.lineWidth = 1
		this.context.strokeStyle = 'black'
		this.context.stroke()
	},
	erasePath: function() {
		this.context.lineWidth = 3
		this.context.strokeStyle = 'white'
		this.context.stroke()
	},
	getOffsetNormal: function(event) {
		return normalizeXY([event.offsetX - this.halfWidth, event.offsetY - this.halfHeight])
	},
	lineToXY: function(xy) {
		this.context.lineTo(xy[0], xy[1])
	},
	mouseMoved: function(event) {
		if (this.view == null) {
			return
		}
		if (this.mouseDown == null) {
			this.drawModelControlPath(event)
			return
		}
		var mouseMovement = [this.mouseDown[0] - event.offsetX, this.mouseDown[1] - event.offsetY]
		var movementLength = getXYLength(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var movementNormal = divideXYByScalar(mouseMovement.slice(0), movementLength)
		if (this.isCircle) {
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(movementNormal), this.view.lastRotationMatrix)
			var rotationY = this.rotationMultiplier * movementLength
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DTransformByRotateY([rotationY]), this.view.rotationMatrix)
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(movementNormal), this.view.rotationMatrix)
			this.draw()
			return
		}
		if (this.isHandle) {
			var mouseMoveNormal = this.getOffsetNormal(event)
			var rotationXY = getXYRotation(mouseMoveNormal, this.mouseDownNegative)
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(rotationXY), this.view.lastRotationMatrix)
			this.draw()
		}
	},
	moveToXY: function(xy) {
		this.context.moveTo(xy[0], xy[1])
	},
	setView: function(viewIndex) {
		this.view = this.views[viewIndex]
		if (this.view.rotationMatrix != null) {
			return
		}
		var meshBoundingBox = getMeshBoundingBox(this.view.mesh)
		var meshExtent = getXYZSubtraction(meshBoundingBox[1], meshBoundingBox[0])
		var scale = this.modelDiameter / getXYZLength(meshExtent)
		var center = multiplyXYZByScalar(getXYZAddition(meshBoundingBox[0], meshBoundingBox[1]), 0.5)
		var meshCenterMatrix = get3DTransformByTranslate3D([-center[0], -center[1], -center[2]])
		// using 2.0 + Math.PI to get average of edge and center movement
		var scaleMatrix = get3DTransformByScale3D([scale, -scale])
		this.view.rotationMatrix = get3DUnitMatrix()
		this.view.scaleCenterMatrix = getMultiplied3DMatrix(scaleMatrix, meshCenterMatrix)
		this.view.lastRotationMatrix = this.view.rotationMatrix
	},
	start: function(height) {
		if (this.views.length == 0) {
			return
		}
		this.canvas = document.getElementById(this.id)
		this.canvas.height = height
		this.canvas.width = height - this.doubleTextSpace - this.doubleTextSpace
		this.context = this.canvas.getContext('2d')
		this.context.fillStyle = 'white'
		this.context.lineJoin = 'round'
		this.halfHeight = this.canvas.height / 2
		this.halfWidth = this.canvas.width / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelDiameter = (this.canvas.width - this.doubleTextSpace - this.doubleTextSpace)
		this.canvasCenterMatrix = get3DTransformByTranslate3D(this.canvasCenter)
		this.modelRadiusCircle = 0.5 * this.modelDiameter + this.textSpace
		this.modelRadiusHandle = this.modelRadiusCircle + this.textSpace
		this.rotationMultiplier = 720.0 / (2.0 + Math.PI) / this.modelDiameter
		var selectedIndex = 0
		setViewSelect(selectedIndex, this.views, this.viewSelectID)
		this.setView(selectedIndex)
		this.canvas.addEventListener('mousedown', viewerMouseDown)
		this.canvas.addEventListener('mousemove', viewerMouseMove)
		this.canvas.addEventListener('mouseout', viewerMouseOut)
		this.canvas.addEventListener('mouseup', viewerMouseUp)
		this.draw()
	}
}
