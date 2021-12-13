//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function setTypeSelect(selectedIndex, types, typeSelectID) {
	var typeSelect = document.getElementById(typeSelectID)
	var options = typeSelect.options
	if (options.length > 0) {
		return
	}
	for (var type of types) {
		option = document.createElement('option')
		option.text = type
		typeSelect.add(option)
	}
	typeSelect.selectedIndex = selectedIndex
}

function setViewSelect(selectedIndex, views, viewSelectID) {
	var viewSelect = document.getElementById(viewSelectID)
	var options = viewSelect.options
	viewSelect.hidden = false
	for (var viewIndex = 0; viewIndex < views.length; viewIndex++) {
		var view = views[viewIndex]
		var option = null
		if (viewIndex >= options.length) {
			option = document.createElement('option')
			viewSelect.add(option)
		}
		else {
			option = options[viewIndex]
		}
		option.text = view.id
	}
	var optionLength = options.length
	for (var optionIndex = optionLength - 1; optionIndex >= views.length; optionIndex--) {
		options.remove(optionIndex)
	}
	viewSelect.selectedIndex = selectedIndex
}

function typeSelectChanged() {
	var typeSelect = document.getElementById(meshViewer.typeSelectID)
	meshViewer.setType(typeSelect.selectedIndex)
	meshViewer.draw()
}
function viewerMouseDown(event) {
	if (meshViewer.view == null) {
		return
	}
	meshViewer.mouseDown = [event.offsetX, event.offsetY]
	meshViewer.isCircle = false
	meshViewer.beginModelRingPath()
	meshViewer.isRing = meshViewer.context.isPointInPath(event.offsetX, event.offsetY)
	if (meshViewer.isRing) {
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
	if (meshViewer.view == null) {
		return
	}
	meshViewer.view.rotationMatrix = meshViewer.view.lastRotationMatrix
	meshViewer.draw()
}

function viewerMouseUp(event) {
	meshViewer.mouseDown = null
	if (meshViewer.view == null) {
		return
	}
	meshViewer.mouseMoved(event)
	meshViewer.view.lastRotationMatrix = meshViewer.view.rotationMatrix
	meshViewer.drawModelControlPath(event)
}

function viewSelectChanged() {
	var viewSelect = document.getElementById(meshViewer.viewSelectID)
	meshViewer.setView(viewSelect.selectedIndex)
	meshViewer.draw()
}


var meshViewer = {
	addMesh: function(id, matrix3D) {
		if (!this.objectMap.has(id)) {
			return
		}
		var mesh = this.objectMap.get(id).getMesh()
		if (mesh == null) {
			return
		}
		this.views.push({id:id, matrix3D:matrix3D, rotationMatrix:null})
	},
	beginModelCirclePath: function() {
		this.context.beginPath()
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, 0, Math.PI + Math.PI)
	},
	beginModelRingPath: function() {
		this.context.beginPath()
		this.context.moveTo(this.halfWidth + this.modelRadiusRing, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusRing, 0, Math.PI + Math.PI)
		this.context.moveTo(this.halfWidth + this.modelRadiusCircle, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, Math.PI + Math.PI, 0, true)
		this.context.closePath()
	},
	draw: function() {
		if (this.view == null) {
			return
		}
		var mesh = this.objectMap.get(this.view.id).getMesh()
		if (this.type.indexOf('T') != -1) {
			if (this.triangleMesh == null) {
				this.triangleMesh = getTriangleMesh(mesh)
			}
			mesh = this.triangleMesh
		}
		var facets = mesh.facets
		var zPolygons = []
		var centerRotationMatrix = getMultiplied3DMatrix(this.view.rotationMatrix, this.view.scaleCenterMatrix)
		centerRotationMatrix = getMultiplied3DMatrix(this.canvasCenterMatrix, centerRotationMatrix)
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
		var xyzs = getXYZsBy3DMatrix(centerRotationMatrix, mesh.points)
		for (var facet of facets) {
			var zPolygon = [new Array(facet.length), facet]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				zPolygon[0][vertexIndex] = xyzs[facet[vertexIndex]][2]
			}
			zPolygon[0].sort(compareNumberDescending)
			if (this.type[0] == 'S') {
				var normal = getNormalByFacetIfFlat(facet, xyzs)
				if (normal != null) {
					if (normal[2] < 0.0) {
						zPolygons.push(zPolygon)
					}
				}
			}
			else {
				zPolygons.push(zPolygon)
			}
		}
		zPolygons.sort(compareArrayAscending)
//		var widthOverLength = 6.0 / zPolygons.length
		if (this.type[0] == 'S') {
			this.context.lineWidth = 5.0
		}
		else {
			this.context.lineWidth = 1.0
		}
		this.context.strokeStyle = 'black'
		for (var zPolygonIndex = 0; zPolygonIndex < zPolygons.length; zPolygonIndex++) {
			this.context.beginPath()
			var facet = zPolygons[zPolygonIndex][1]
			this.moveToXY(xyzs[facet[0]])
			for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
				this.lineToXY(xyzs[facet[vertexIndex]])
			}
			this.context.closePath()
//			this.context.lineWidth = Math.ceil(widthOverLength * (zPolygonIndex + 1))
 			this.context.stroke()
			if (this.type[0] == 'S') {
				this.context.fill()
			}
		}
	},
	drawModelControlPath: function(event) {
		this.beginModelCirclePath()
		if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
			this.beginModelRingPath()
			this.erasePath()
			this.beginModelCirclePath()
			this.drawPath()
			return
		}
		this.beginModelRingPath()
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
	initialize: function() {
		this.canvasID = null
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.doubleTextSpace = this.textSpace + this.textSpace
		this.viewID = null
		this.typeSelectedIndex = 0
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
		var mouseMovement = [event.offsetX - this.mouseDown[0], event.offsetY - this.mouseDown[1]]
		var movementLength = getXYLength(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		if (this.isCircle) {
			var movementNormal = divideXYByScalar(mouseMovement.slice(0), movementLength)
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(movementNormal), this.view.lastRotationMatrix)
			var rotationY = this.rotationMultiplier * movementLength
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DTransformByRotateY([rotationY]), this.view.rotationMatrix)
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(movementNormal), this.view.rotationMatrix)
			this.draw()
			return
		}
		if (this.isRing) {
			var mouseMoveNormal = this.getOffsetNormal(event)
			var rotationXY = getXYRotation(mouseMoveNormal, this.mouseDownNegative)
			this.view.rotationMatrix = getMultiplied3DMatrix(get3DMatrixRotatedByXY(rotationXY), this.view.lastRotationMatrix)
			this.draw()
		}
	},
	moveToXY: function(xy) {
		if (xy != undefined) {
			this.context.moveTo(xy[0], xy[1])
		}
	},
	setID: function(canvasID, objectMap, typeSelectID, viewSelectID) {
		if (canvasID != this.canvasID) {
			this.canvasID = canvasID
			this.canvas = document.getElementById(canvasID)
			this.canvas.addEventListener('mousedown', viewerMouseDown)
			this.canvas.addEventListener('mousemove', viewerMouseMove)
			this.canvas.addEventListener('mouseout', viewerMouseOut)
			this.canvas.addEventListener('mouseup', viewerMouseUp)
		}
		this.objectMap = objectMap
		this.triangleMesh = null
		this.types = ['Solid Polyhedral', 'Solid Triangular', 'Wireframe Polyhedral', 'Wireframe Triangular']
		this.type = this.types[this.typeSelectedIndex]
		this.typeSelectID = typeSelectID
		this.view = null
		this.views = []
		this.viewSelectID = viewSelectID
		this.mouseDown = null
	},
	setType: function(typeSelectedIndex) {
		this.typeSelectedIndex = typeSelectedIndex
		this.type = this.types[typeSelectedIndex]
	},
	setView: function(viewIndex) {
		this.view = this.views[viewIndex]
		this.viewID = this.view.id
		if (this.view.rotationMatrix != null) {
			return
		}
		var meshBoundingBox = getMeshBoundingBox(this.objectMap.get(this.viewID).getMesh())
		var meshExtent = getXYZSubtraction(meshBoundingBox[1], meshBoundingBox[0])
		var scale = this.modelDiameter / getXYZLength(meshExtent)
		var center = multiplyXYZByScalar(getXYZAddition(meshBoundingBox[0], meshBoundingBox[1]), 0.5)
		var meshCenterMatrix = get3DTransformByTranslate3D([-center[0], -center[1], -center[2]])
		// using 2.0 + Math.PI to get average of edge and center movement
		var scaleMatrix = get3DTransformByScale3D([scale, -scale, scale])
		this.triangleMesh = null
		this.view.rotationMatrix = get3DUnitMatrix()
		this.view.scaleCenterMatrix = getMultiplied3DMatrix(scaleMatrix, meshCenterMatrix)
		this.view.lastRotationMatrix = this.view.rotationMatrix
	},
	start: function(height) {
		this.canvas.height = height
		this.canvas.width = height - this.doubleTextSpace - this.doubleTextSpace
		var isHidden = (this.views.length == 0)
		document.getElementById(this.typeSelectID).hidden = isHidden
		document.getElementById(this.viewSelectID).hidden = isHidden
		if (this.views.length == 0) {
			return
		}
		this.context = this.canvas.getContext('2d')
		this.context.fillStyle = 'white'
		this.context.lineJoin = 'round'
		this.halfHeight = this.canvas.height / 2
		this.halfWidth = this.canvas.width / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelDiameter = (this.canvas.width - this.doubleTextSpace - this.doubleTextSpace)
		this.canvasCenterMatrix = get3DTransformByTranslate3D(this.canvasCenter)
		this.modelRadiusCircle = 0.5 * this.modelDiameter + this.textSpace
		this.modelRadiusRing = this.modelRadiusCircle + this.textSpace
		this.rotationMultiplier = 720.0 / (2.0 + Math.PI) / this.modelDiameter
		var selectedIndex = 0
		setTypeSelect(this.typeSelectedIndex, this.types, this.typeSelectID)
		this.views.sort(compareIDAscending)
		for (var viewIndex = 0; viewIndex < this.views.length; viewIndex++) {
			if (this.views[viewIndex].id == this.viewID) {
				selectedIndex = viewIndex
				break
			}
		}
		setViewSelect(selectedIndex, this.views, this.viewSelectID)
		this.setView(selectedIndex)
		this.setType(this.typeSelectedIndex)
		this.draw()
	}
}

meshViewer.initialize()
