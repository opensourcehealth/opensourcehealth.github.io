//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function wordscapeViewerDraw() {
	meshViewer.draw()
}

function setTypeSelect(selectedIndex, types) {
	var typeSelect = document.getElementById('typeSelectID')
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

function setViewSelect(selectedIndex, views) {
	var viewSelect = document.getElementById('viewSelectID')
	var options = viewSelect.options
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

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function typeSelectChanged() {
	meshViewer.setType(document.getElementById('typeSelectID').selectedIndex)
	meshViewer.draw()
}

function updateView() {
	var isViewHidden = !getSessionBoolean('isViewHidden@')
	document.getElementById('typeSelectID').hidden = isViewHidden
	document.getElementById('viewSelectID').hidden = isViewHidden
}

function viewerMouseDown(event) {
	if (meshViewer.view == null) {
		return
	}
	meshViewer.mouseDown(event)
}

function viewerMouseMove(event) {
	meshViewer.mouseMoved(event)
}

function viewerMouseOut(event) {
	meshViewer.mouseDown2D = null
	if (meshViewer.view == null) {
		return
	}
	if (meshViewer.view.isMesh) {
		meshViewer.view.rotationMatrix = meshViewer.view.lastRotationMatrix
	}
	meshViewer.draw()
}

function viewerMouseUp(event) {
	meshViewer.mouseDown2D = null
	if (meshViewer.view == null) {
		return
	}
	if (!meshViewer.view.isMesh) {
		return
	}
	meshViewer.mouseMoved(event)
	meshViewer.view.lastRotationMatrix = meshViewer.view.rotationMatrix
	meshViewer.drawModelControlPath(event)
}

function viewSelectChanged() {
	var viewSelect = document.getElementById('viewSelectID')
	meshViewer.setView(viewSelect.selectedIndex)
	meshViewer.draw()
}


var meshViewer = {
	addImage: function(filename, id) {
		this.views.push({filename:filename, height:null, id:id, image:null, isMesh:false, polyline:[]})
	},
	addMesh: function(id, matrix3D) {
		if (getWorkMeshByID(id, this.registry) != null) {
			this.views.push({id:id, isMesh:true, matrix3D:matrix3D, mesh:null, rotationMatrix:null, triangleMesh:null})
		}
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
	drawViewImage: function(view) {
		if (view.image == null) {
			view.image = new Image()
			view.image.src = view.filename
		}
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
		if (view.image.complete) {
			if (view.height == null) {
				var greatestDimension = Math.max(view.image.naturalHeight, view.image.naturalWidth)
				var zoomRatio = 1.0 * this.canvas.width / greatestDimension
				view.height = zoomRatio * view.image.naturalHeight
				view.width = zoomRatio * view.image.naturalWidth
				view.halfCanvasMinus = this.halfWidth - view.width / 2
				view.canvasHeightMinus = this.canvas.height - view.height
			}
			this.context.drawImage(view.image, view.halfCanvasMinus, view.canvasHeightMinus, view.width, view.height)
		}
		else {
			view.image.onload = wordscapeViewerDraw
		}
	},
	draw: function() {
		var view = this.view
		if (view == null) {
			return
		}
		if (view.isMesh == false) {
			this.drawViewImage(view)
			return
		}
		if (view.mesh == null) {
			view.mesh = getWorkMeshByID(view.id, this.registry)
		}
		var mesh = view.mesh
		if (this.type.indexOf('T') != -1) {
			if (view.triangleMesh == null) {
				view.triangleMesh = getTriangleMesh(view.mesh)
			}
			mesh = view.triangleMesh
		}
		var facets = mesh.facets
		var zPolygons = []
		var centerRotationMatrix = getMultiplied3DMatrix(view.rotationMatrix, view.scaleCenterMatrix)
		centerRotationMatrix = getMultiplied3DMatrix(this.canvasCenterMatrix, centerRotationMatrix)
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
		var xyzs = get3DsBy3DMatrix(centerRotationMatrix, mesh.points)
		for (var facet of facets) {
			var zPolygon = [new Array(facet.length), facet]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				zPolygon[0][vertexIndex] = xyzs[facet[vertexIndex]][2]
			}
			zPolygon[0].sort(compareNumberDescending)
			if (this.type[0] == 'S') {
//				if (getNormalByFacet(facet, xyzs)[2] < 0.0) {
				if (getDoublePolygonArea(getPolygonByFacet(facet, xyzs)) > 0.0) {
					zPolygons.push(zPolygon)
				}
			}
			else {
				zPolygons.push(zPolygon)
			}
		}
		zPolygons.sort(compareArrayAscending)
//		var widthOverLength = 6.0 / zPolygons.length
		if (this.type[0] == 'S') {
			this.context.lineWidth = 2.0
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
		return normalize2D([event.offsetX - this.halfWidth, event.offsetY - this.halfHeight])
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
	mouseDown: function(event) {
		if (this.view == null) {
			return
		}
		this.mouseDown2D = [event.offsetX, event.offsetY]
		if (!this.view.isMesh) {
			this.view.polyline.push(this.mouseDown2D)
			var boundingBox = getBoundingBox(this.view.polyline)
			var minimumPoint = boundingBox[0]
			var size = get2DSubtraction(boundingBox[1], minimumPoint)
			var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
			var fittedString = ''
			var multiplier = 100.0 / maximumDimension
			for (var fittedIndex = 0; fittedIndex < this.view.polyline.length; fittedIndex++) {
				var point = this.view.polyline[fittedIndex]
				var x = multiplier * (point[0] - minimumPoint[0])
				var y = multiplier * (boundingBox[1][1] - point[1])
				fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
			}
			console.log(fittedString)
			return
		}
		this.isCircle = false
		this.beginModelRingPath()
		this.isRing = this.context.isPointInPath(event.offsetX, event.offsetY)
		if (this.isRing) {
			this.mouseDownNegative = this.getOffsetNormal(event)
			this.mouseDownNegative[1] = -this.mouseDownNegative[1]
		}
		else {
			this.beginModelCirclePath()
			this.isCircle = this.context.isPointInPath(event.offsetX, event.offsetY)
		}
		this.view.lastRotationMatrix = meshViewer.view.rotationMatrix
	},
	mouseMoved: function(event) {
		if (this.view == null) {
			return
		}
		if (!this.view.isMesh) {
			this.context.clearRect(0, 0, this.canvas.width / 2, this.doubleTextSpace + 1)
			this.context.font = '12px Arial'
			this.context.strokeStyle = 'black'
			this.context.strokeText('x :  ' + event.offsetX, this.textHeight / 2, this.textSpace)
			this.context.strokeText('y :  ' + event.offsetY, this.textHeight / 2, this.doubleTextSpace)
			return
		}
		if (this.mouseDown2D == null) {
			this.drawModelControlPath(event)
			return
		}
		var mouseMovement = [event.offsetX - this.mouseDown2D[0], event.offsetY - this.mouseDown2D[1]]
		var movementLength = get2DLength(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		if (this.isCircle) {
			var movementNormal = divide2DByScalar(mouseMovement.slice(0), movementLength)
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), this.view.lastRotationMatrix)
			var rotationY = this.rotationMultiplier * movementLength
			this.view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DByRotateY([rotationY]), this.view.rotationMatrix)
			movementNormal[1] = -movementNormal[1]
			this.view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), this.view.rotationMatrix)
			this.draw()
			return
		}
		if (this.isRing) {
			var mouseMoveNormal = this.getOffsetNormal(event)
			var rotationXY = get2DRotation(mouseMoveNormal, this.mouseDownNegative)
			this.view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(rotationXY), this.view.lastRotationMatrix)
			this.draw()
		}
	},
	moveToXY: function(xy) {
		if (xy != undefined) {
			this.context.moveTo(xy[0], xy[1])
		}
	},
	setID: function(canvasID, registry) {
		if (canvasID != this.canvasID) {
			this.canvasID = canvasID
			this.canvas = document.getElementById(canvasID)
			this.canvas.addEventListener('mousedown', viewerMouseDown)
			this.canvas.addEventListener('mousemove', viewerMouseMove)
			this.canvas.addEventListener('mouseout', viewerMouseOut)
			this.canvas.addEventListener('mouseup', viewerMouseUp)
		}
		this.registry = registry
		this.triangleMesh = null
		this.types = ['Solid Polyhedral', 'Solid Triangular', 'Wireframe Polyhedral', 'Wireframe Triangular']
		this.type = this.types[this.typeSelectedIndex]
		this.view = null
		this.views = []
		this.mouseDown2D = null
	},
	setType: function(typeSelectedIndex) {
		this.typeSelectedIndex = typeSelectedIndex
		this.type = this.types[typeSelectedIndex]
	},
	setView: function(viewIndex) {
		this.view = this.views[viewIndex]
		this.viewID = this.view.id
		if (!this.view.isMesh) {
			return
		}
		if (this.view.rotationMatrix != null) {
			return
		}
		var meshBoundingBox = getMeshBoundingBox(getWorkMeshByID(this.viewID, this.registry))
		var meshExtent = get3DSubtraction(meshBoundingBox[1], meshBoundingBox[0])
		var scale = this.modelDiameter / get3DLength(meshExtent)
		var center = multiply3DByScalar(get3DAddition(meshBoundingBox[0], meshBoundingBox[1]), 0.5)
		var meshCenterMatrix = getMatrix3DByTranslate3D([-center[0], -center[1], -center[2]])
		// using 2.0 + Math.PI to get average of edge and center movement
		var scaleMatrix = getMatrix3DByScale3D([scale, -scale, scale])
		this.view.rotationMatrix = getUnitMatrix3D()
		this.view.scaleCenterMatrix = getMultiplied3DMatrix(scaleMatrix, meshCenterMatrix)
		this.view.lastRotationMatrix = this.view.rotationMatrix
	},
	start: function(height) {
		this.canvas.height = height
		this.canvas.width = height - this.doubleTextSpace - this.doubleTextSpace
		var isDisabled = (this.views.length == 0)
		document.getElementById(this.canvasID).hidden = isDisabled
		document.getElementById('typeSelectID').disabled = isDisabled
		document.getElementById('viewSelectID').disabled = isDisabled
		updateView()
		if (this.views.length == 0) {
			return
		}
		this.context = this.canvas.getContext('2d')
		this.context.fillStyle = '#e0e0e0'
		this.context.lineJoin = 'round'
		this.halfHeight = this.canvas.height / 2
		this.halfWidth = this.canvas.width / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelRadiusRing = 0.5 * this.canvas.width
		this.modelRadiusCircle = this.modelRadiusRing - this.textSpace
		this.modelDiameter = this.modelRadiusCircle + this.modelRadiusCircle - 0.5 * this.textSpace
		this.canvasCenterMatrix = getMatrix3DByTranslate3D(this.canvasCenter)
		this.rotationMultiplier = 720.0 / (2.0 + Math.PI) / this.modelDiameter
		var selectedIndex = 0
		setTypeSelect(this.typeSelectedIndex, this.types)
		this.views.sort(compareIDAscending)
		for (var viewIndex = 0; viewIndex < this.views.length; viewIndex++) {
			if (this.views[viewIndex].id == this.viewID) {
				selectedIndex = viewIndex
				break
			}
		}
		setViewSelect(selectedIndex, this.views)
		this.setView(selectedIndex)
		this.setType(this.typeSelectedIndex)
		this.draw()
	}
}

meshViewer.initialize()
