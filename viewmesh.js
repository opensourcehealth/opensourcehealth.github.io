//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drawAnalysis(control, viewer) {
	var context = viewBroker.context
	clearBoundingBox(control.boundingBox, context)
	var meshBoundingBox = viewer.meshBoundingBox
	var size = getSubtraction3D(meshBoundingBox[1], meshBoundingBox[0])
	var y = 2 * viewBroker.textSpace
	setTextContext(context)
	context.textAlign = 'left'
	drawArray(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
	context.fillText('Size', viewBroker.analysisSizeBegin, viewBroker.textSpace)
	drawNumericArray(context, size, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	context.fillText('Lower', viewBroker.analysisLowerBegin, viewBroker.textSpace)
	drawNumericArray(context, meshBoundingBox[0], viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
	context.fillText('Upper', viewBroker.analysisUpperBegin, viewBroker.textSpace)
	drawNumericArray(context, meshBoundingBox[1], viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
}

function drawGrid(boundingBox, canvasRotationMatrix, context, viewer) {
	var directionIndex = getMatrixDirectionIndex(viewer.rotationMatrix)
	var halfDirectionIndex = Math.floor(directionIndex / 2)
	var xDimension = [2, 0, 0][halfDirectionIndex]
	var yDimension = [1, 2, 1][halfDirectionIndex]
	var zDimension = [0, 1, 2][halfDirectionIndex]
	var heightMinusOver = 1.8 * viewBroker.halfHeightMinus / viewer.scale / viewBroker.viewMesh.zoomControl.value
	var step = getIntegerStep(0.2 * heightMinusOver)
	var directionXOver = -viewer.centerOffset[xDimension] / step
	var directionYOver = -viewer.centerOffset[yDimension] / step
	heightMinusOver /= step
	var halfStep = 0.5 * step
	var floorX = step * Math.floor(directionXOver - heightMinusOver)
	var ceilX = step * Math.ceil(directionXOver + heightMinusOver)
	var ceilXPlus = ceilX + halfStep
	var floorY = step * Math.floor(directionYOver - heightMinusOver)
	var ceilY = step * Math.ceil(directionYOver + heightMinusOver)
	var ceilYPlus = ceilY + halfStep
	if (viewBroker.viewMesh.colorControl.selectedState) {
		context.fillStyle = ['#b06060', '#e07070', '#60b060', '#70e070', '#6060b0', '#7070e0'][directionIndex]
	}
	else {
		context.fillStyle = '#c0c0c0'
	}
	var z = -viewer.centerOffset[zDimension]
	for (var x = floorX; x < ceilXPlus; x += step) {
		var bottom = [z, z, z]
		bottom[xDimension] = x
		bottom[yDimension] = floorY
		bottom = get3DBy3DMatrix(canvasRotationMatrix, bottom)
		var top = [z, z, z]
		top[xDimension] = x
		top[yDimension] = ceilY
		top = get3DBy3DMatrix(canvasRotationMatrix, top)
		drawOutsetLine(bottom, context, top, 1)
	}
	for (var y = floorY; y < ceilYPlus; y += step) {
		var left = [z, z, z]
		left[xDimension] = floorX
		left[yDimension] = y
		left = get3DBy3DMatrix(canvasRotationMatrix, left)
		var right = [z, z, z]
		right[xDimension] = ceilX
		right[yDimension] = y
		right = get3DBy3DMatrix(canvasRotationMatrix, right)
		drawOutsetLine(left, context, right, 1)
	}
}

function drawMesh(control, viewer) {
	var mesh = viewer.mesh
	var context = viewBroker.context
	var viewMesh = viewBroker.viewMesh
	if (viewBroker.type.indexOf('T') != -1) {
		if (viewer.triangleMesh == null) {
			viewer.triangleMesh = getTriangleMesh(mesh)
		}
		mesh = viewer.triangleMesh
	}
	var boundingBox = control.boundingBox
	var facets = mesh.facets
	var zPolygons = []
	var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
	clearBoundingBoxClip(boundingBox, context)
	context.strokeStyle = 'black'
	var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
	if (viewMesh.gridControl.selectedState) {
		drawGrid(boundingBox, canvasRotationMatrix, context, viewer)
	}
	context.fillStyle = '#e0e0e0'
	if (viewBroker.type[0] == 'S') {
		context.lineWidth = 2.0
	}
	else {
		context.lineWidth = 1.0
	}
	if (getIsSlice(viewMesh)) {
		drawSlice(canvasPoints, control, mesh, viewer)
		return
	}
	for (var facet of facets) {
		var zPolygon = [new Array(facet.length), facet]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zPolygon[0][vertexIndex] = canvasPoints[facet[vertexIndex]][2]
		}
		zPolygon[0].sort(compareNumberDescending)
		if (viewBroker.type[0] == 'S') {
			if (getDoublePolygonArea(getPolygonByFacet(facet, canvasPoints)) > 0.0) {
				zPolygons.push(zPolygon)
			}
		}
		else {
			zPolygons.push(zPolygon)
		}
	}
	zPolygons.sort(compareArrayAscending)
	for (var zPolygonIndex = 0; zPolygonIndex < zPolygons.length; zPolygonIndex++) {
		context.beginPath()
		var facet = zPolygons[zPolygonIndex][1]
		if (viewMesh.colorControl.selectedState) {
			var normal = getNormalByFacet(facet, mesh.points)
			if (normal != null) {
				var red = 128 + 87 * Math.abs(normal[0]) + 40 * (normal[0] < -gClose)
				var green = 128 + 87 * Math.abs(normal[1]) + 40 * (normal[1] > gClose)
				var blue = 128 + 87 * Math.abs(normal[2]) + 40 * (normal[2] > gClose)
				var colorString = 'rgb(' + red + ', ' + green + ', ' + blue + ')'
				if (viewBroker.type[0] == 'S') {
					context.fillStyle = colorString
				}
				else {
					context.strokeStyle = colorString
				}
			}
		}
		moveToPoint(context, canvasPoints[facet[0]])
		for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
			lineToPoint(context, canvasPoints[facet[vertexIndex]])
		}
		context.closePath()
		context.stroke()
		if (viewBroker.type[0] == 'S') {
			context.fill()
		}
	}
	context.restore()
}

function drawMeshByViewer() {
	drawMesh(viewBroker.viewMesh.meshControl, viewBroker.view)
}

function drawSlice(canvasPoints, control, mesh, viewer) {
	var context = viewBroker.context
	if (viewBroker.viewMesh.colorControl.selectedState) {
		var directionIndex = getMatrixDirectionIndex(viewer.rotationMatrix)
		var colorString = ['#d78080', '#ff8080', '#80d780', '#80ff80', '#8080d7', '#8080ff'][directionIndex]
		if (viewBroker.type[0] == 'S') {
			context.fillStyle = colorString
		}
		else {
			context.strokeStyle = colorString
		}
	}
	sliceControl = viewBroker.viewMesh.sliceControl
	var rangeZ = getRangeZ(canvasPoints)
	var sliderPortion = (sliceControl.value - sliceControl.lower) / (sliceControl.upper - sliceControl.lower)
	var z = rangeZ.differenceZ * sliceControl.value + rangeZ.lowerZ
	if (viewer.triangleMesh == null) {
		viewer.triangleMesh = getTriangleMesh(mesh)
	}
	var polygons = getSlicePolygonsByZ({facets:viewer.triangleMesh.facets, points:canvasPoints}, z)
	var polygonGroups = getPolygonGroups(polygons)
	for (var polygonGroup of polygonGroups) {
		directPolygonGroup(polygonGroup)
		var polygon = getConnectedPolygon(polygonGroup)
		context.beginPath()
		moveToPoint(context, polygon[0])
		for (var vertexIndex = 1; vertexIndex < polygon.length; vertexIndex++) {
			lineToPoint(context, polygon[vertexIndex])
		}
		context.closePath()
		context.stroke()
		if (viewBroker.type[0] == 'S') {
			context.fill()
		}
	}
	context.restore()
}

function getCanvasRotationMatrix(viewer) {
	return getMultiplied3DMatrix(viewBroker.canvasCenterMatrix, getCenterRotationMatrix(viewer))
}

function getCenterRotationMatrix(viewer) {
	var zoomScalePoint = getMultiplication3DScalar(viewer.scalePoint, viewBroker.viewMesh.zoomControl.value)
	var scaleCenterMatrix = getMultiplied3DMatrix(getMatrix3DByScale3D(zoomScalePoint), getMatrix3DByTranslate(viewer.centerOffset))
	return getMultiplied3DMatrix(viewer.rotationMatrix, scaleCenterMatrix)
}

function getIsSlice(viewMesh) {
	sliceControl = viewMesh.sliceControl
	return sliceControl.value != sliceControl.lower && sliceControl.value != sliceControl.upper
}

function getMatrixDirectionIndex(matrix3D) {
	var directionIndex = 5
	var highestAxisProduct = get3DBy3DMatrix(matrix3D, [0.0, 0.0, 1.0])[2]
	if (highestAxisProduct < 0.0) {
		highestAxisProduct = -highestAxisProduct
		directionIndex = 4
	}
	var axisProductY = get3DBy3DMatrix(matrix3D, [0.0, 1.0, 0.0])[2]
	if (Math.abs(axisProductY) > highestAxisProduct) {
		directionIndex = 2
		if (axisProductY < 0.0) {
			axisProductY = -axisProductY
			directionIndex = 3
		}
		highestAxisProduct = axisProductY
	}
	var axisProductZ = get3DBy3DMatrix(matrix3D, [1.0, 0.0, 0.0])[2]
	if (Math.abs(axisProductZ) > highestAxisProduct) {
		directionIndex = 1
		if (axisProductZ > 0.0) {
			return 0
		}
	}
	return directionIndex
}

function mouseDownSwivel(control, event, viewer) {
	var viewMesh = viewBroker.viewMesh
	if (viewMesh.choiceControl.selectedIndex == 0) {
		var mesh = viewer.mesh
		if (mesh.points.length == 0 || viewBroker.mouseDown2D == null || getIsSlice(viewMesh)) {
			return
		}
		var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
		var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
		var context = viewBroker.context
		var rangeZ = getRangeZ(canvasPoints)
		var multiplierZ = 0.0
		if (rangeZ.differenceZ > 0.0) {
			multiplierZ = 1.0 / rangeZ.differenceZ
		}
		var closestPointIndex = null
		var closestDistanceSquared = Number.MAX_VALUE
		for (var pointIndex = 0; pointIndex < mesh.points.length; pointIndex++) {
			var canvasPoint = canvasPoints[pointIndex]
			var distanceSquared = distanceSquared2D(canvasPoint, viewBroker.mouseDown2D) + multiplierZ * (rangeZ.upperZ - canvasPoint[2])
			if (distanceSquared < closestDistanceSquared) {
				closestDistanceSquared = distanceSquared
				closestPointIndex = pointIndex
			}
		}
		var mousePoint = mesh.points[closestPointIndex]
		var change = null
		if (viewMesh.choiceControl.last != undefined) {
			change = getSubtraction3D(mousePoint, viewMesh.choiceControl.last)
			change.push(length3D(change))
			if (change[3] < gClose) {
				return
			}
		}
		clearBoundingBox(viewMesh.inspectBoundingBox, context)
		setTextContext(context)
		context.textAlign = 'left'
		var y = 2 * viewBroker.textSpace + viewBroker.analysisBottom
		drawArray(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
		context.fillText('Mouse', viewBroker.analysisLowerBegin, viewBroker.textSpace + viewBroker.analysisBottom)
		drawNumericArray(context, mousePoint, viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
		if (viewMesh.choiceControl.last != undefined) {
			context.fillText('Last', viewBroker.analysisSizeBegin, viewBroker.textSpace + viewBroker.analysisBottom)
			drawNumericArray(context, viewMesh.choiceControl.last, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
			context.fillText('Change', viewBroker.analysisUpperBegin, viewBroker.textSpace + viewBroker.analysisBottom)
			drawNumericArray(context, change, viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
		}
		viewMesh.choiceControl.last = mousePoint
		return
	}
	viewBroker.mouseDownCenterOffset = viewer.centerOffset
	viewer.lastRotationMatrix = viewer.rotationMatrix
	if (viewMesh.choiceControl.selectedIndex == 1) {
		viewBroker.mouseMoveManipulator = moveMatrixManipulator
	}
	else {
		viewBroker.mouseMoveManipulator = swivelMatrixManipulator
	}
}

function meshMouseOut(viewer) {
	viewer.rotationMatrix = viewer.lastRotationMatrix
	drawMeshByViewer()
	viewBroker.mouseDown2D = null
	viewBroker.mouseMoveManipulator = null
}

function meshMouseUp(viewer) {
	viewBroker.mouseMoveManipulator = null
	viewBroker.mouseDown2D = null
	viewBroker.viewMesh.choiceControl.last = undefined
	viewer.lastRotationMatrix = viewer.rotationMatrix
}

function mouseDownAlign(control, event, viewer) {
	var highestTransformed = null
	var highestZ = -Number.MAX_VALUE
	var view = viewer
	var rotationMatrix = view.rotationMatrix
	for (var direction of gDirections) {
		var transformed = get3DBy3DMatrix(rotationMatrix, direction)
		if (transformed[2] > highestZ) {
			highestTransformed = transformed
			highestZ = transformed[2]
		}
	}
	normalize3D(highestTransformed)
	highestZ = highestTransformed[2]
	var zAxis = [0.0, 0.0, 1.0]
	var crossTurn = crossProduct(zAxis, highestTransformed)
	normalize3D(crossTurn)
	crossTurn.push(highestZ)
	crossTurn.push(-Math.sqrt(1.0 - highestZ * highestZ))
	rotationMatrix = getMultiplied3DMatrix(getMatrix3DByVectorCosSin(crossTurn), rotationMatrix)
	highestTransformed = null
	var highestX = -Number.MAX_VALUE
	for (var direction of gDirections) {
		var transformed = get3DBy3DMatrix(rotationMatrix, direction)
		if (transformed[0] > highestX) {
			highestTransformed = transformed
			highestX = transformed[0]
		}
	}
	normalize3D(highestTransformed)
	highestX = highestTransformed[0]
	var y = Math.sqrt(1.0 - highestX * highestX)
	if (highestTransformed[1] > 0) {
		y = -y
	}
	view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DZByCosSin(highestX, y), rotationMatrix)
	view.lastRotationMatrix = view.rotationMatrix
	drawMeshByViewer()
}

function mouseDownStepTurn(control, event, viewer) {
	setViewerToTurn(viewer)
	viewBroker.mouseMoveManipulator = stepTurnManipulator
}

function mouseDownTurn(control, event, viewer) {
	setViewerToTurn(viewer)
	viewBroker.mouseMoveManipulator = turnManipulator
}

var moveMatrixManipulator = {
	mouseMove: function(event) {
		viewer = viewBroker.view
		if (viewBroker.mouseDown2D == null) {
			return
		}
		var mouseMovement = [event.offsetX - viewBroker.mouseDown2D[0], event.offsetY - viewBroker.mouseDown2D[1]]
		var movementLength = length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var inverseMatrix3D = getInverseRotation3D(getCenterRotationMatrix(viewer))
		mouseMovement.push(0.0)
		var invertedMovement = get3DBy3DMatrix(inverseMatrix3D, mouseMovement)
		viewer.centerOffset = getAddition3D(invertedMovement, viewBroker.mouseDownCenterOffset)
		drawMeshByViewer()
	},
	mouseOut: function(event) {
		meshMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		meshMouseUp(viewBroker.view)
	}
}

function setViewerToTurn(viewer) {
	viewer.mouseDownNegative = viewBroker.getOffsetNormal(event)
	viewer.mouseDownNegative[1] = -viewer.mouseDownNegative[1]
	viewer.lastRotationMatrix = viewer.rotationMatrix
}

var stepTurnManipulator = {
	mouseMove: function(event) {
		viewer = viewBroker.view
		var mouseMoveNormal = viewBroker.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, viewer.mouseDownNegative)
		var stepRotation = Math.round(12.0 * Math.atan2(rotationXY[1], rotationXY[0]) / Math.PI) * Math.PI / 12.0
		var rotationZMatrix = getMatrix3DZByCosSin(Math.cos(stepRotation), Math.sin(stepRotation))
		viewer.rotationMatrix = getMultiplied3DMatrix(rotationZMatrix, viewer.lastRotationMatrix)
		drawMeshByViewer()
	},
	mouseOut: function(event) {
		meshMouseOut(viewer)
	},
	mouseUp: function(event) {
		meshMouseUp(viewer)
	}
}

var swivelMatrixManipulator = {
	mouseMove: function(event) {
		viewer = viewBroker.view
		if (viewBroker.mouseDown2D == null) {
			return
		}
		var mouseMovement = [event.offsetX - viewBroker.mouseDown2D[0], event.offsetY - viewBroker.mouseDown2D[1]]
		var movementLength = length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var movementNormal = divide2DScalar(mouseMovement.slice(0), movementLength)
		movementNormal[1] = -movementNormal[1]
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), viewer.lastRotationMatrix)
		var rotationY = viewBroker.rotationMultiplier * movementLength
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DByRotateY([-rotationY]), viewer.rotationMatrix)
		movementNormal[1] = -movementNormal[1]
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), viewer.rotationMatrix)
		drawMeshByViewer()
	},
	mouseOut: function(event) {
		meshMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		meshMouseUp(viewBroker.view)
	}
}

var turnManipulator = {
	mouseMove: function(event) {
		viewer = viewBroker.view
		var mouseMoveNormal = viewBroker.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, viewer.mouseDownNegative)
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(rotationXY), viewer.lastRotationMatrix)
		drawMeshByViewer()
	},
	mouseOut: function(event) {
		meshMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		meshMouseUp(viewBroker.view)
	}
}

function ViewMesh() {
	this.draw = function() {
		if (this.rotationMatrix == null) {
			this.meshBoundingBox = getMeshBoundingBox(this.mesh)
			this.scale = viewBroker.modelDiameter / length3D(getSubtraction3D(this.meshBoundingBox[1], this.meshBoundingBox[0]))
			this.scalePoint = [this.scale, -this.scale, this.scale]
			this.centerOffset = multiply3DScalar(getAddition3D(this.meshBoundingBox[0], this.meshBoundingBox[1]), -0.5)
			this.rotationMatrix = getUnitMatrix3D()
			this.lastRotationMatrix = this.rotationMatrix
		}
		drawControls(viewBroker.viewMesh.controls, this)
	}
	this.mouseDown = function(event) {
		mouseDownControls(viewBroker.viewMesh.controls, event, this)
	}
	this.mouseMove = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			viewBroker.mouseMoveManipulator.mouseMove(event)
		}
	}
	this.mouseOut = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			viewBroker.mouseMoveManipulator.mouseOut(event)
		}
	}
	this.mouseUp = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			viewBroker.mouseMoveManipulator.mouseUp(event)
		}
	}
	this.rotationMatrix = null
	this.start = function() {
		var controls = []
		var height = viewBroker.canvas.height
		this.mesh = getMeshByID(this.id, viewBroker.registry)
		var viewMesh = {controls:controls}
		viewBroker.viewMesh = viewMesh
		var intervals = intervalsFromToQuantity(0.0, height, 4, false)
		for (var intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
			intervals[intervalIndex] = Math.round(intervals[intervalIndex])
		}
		controls.push({boundingBox:[[0, 0], [intervals[0], viewBroker.controlWidth]], mouseDown:mouseDownAlign, text:'Align'})
		controls.push(
		{boundingBox:[[intervals[0], 0], [intervals[1], viewBroker.controlWidth]], mouseDown:mouseDownStepTurn, text:'Step Turn'})
		controls.push(
		{boundingBox:[[intervals[1], 0], [intervals[2], viewBroker.controlWidth]], mouseDown:mouseDownTurn, text:'Turn'})
		viewMesh.colorControl = getCheckbox([[intervals[2], 0], [intervals[3], viewBroker.controlWidth]], 'Color')
		viewMesh.colorControl.controlChanged = drawMeshByViewer
		controls.push(viewMesh.colorControl)
		var analysisControl = {boundingBox:viewBroker.analysisBoundingBox, draw:drawAnalysis}
		controls.push(analysisControl)
		viewMesh.inspectBoundingBox = [[height, viewBroker.analysisBottom], [viewBroker.canvas.width, height]]
		var controlBoundingBox = [[viewBroker.controlWidth, viewBroker.controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		viewMesh.meshControl = {boundingBox:controlBoundingBox, draw:drawMesh, mouseDown:mouseDownSwivel}
		controls.push(viewMesh.meshControl)
		var sliceBoundingBox = [[0, viewBroker.controlWidth], [viewBroker.controlWidth, viewBroker.heightMinus]]
		viewMesh.sliceControl = getVerticalSlider(sliceBoundingBox, 0.0, 'S', 1.0)
		viewMesh.sliceControl.controlChanged = drawMeshByViewer
		controls.push(viewMesh.sliceControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, viewBroker.controlWidth], [height, viewBroker.heightMinus]]
		viewMesh.zoomControl = getVerticalSlider(zoomBoundingBox, 1.0, 'Z', 5.0)
		viewMesh.zoomControl.controlChanged = drawMeshByViewer
		controls.push(viewMesh.zoomControl)
		viewMesh.choiceControl = getChoice([[0, viewBroker.heightMinus], [intervals[2], height]], ['Inspect', 'Move', 'Swivel'], 2)
		controls.push(viewMesh.choiceControl)
		viewMesh.gridControl = getCheckbox([[intervals[2], viewBroker.heightMinus], [height, height]], 'Grid', false)
		viewMesh.gridControl.controlChanged = drawMeshByViewer
		controls.push(viewMesh.gridControl)
	}
}
