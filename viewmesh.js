//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drawAnalysis(control, viewer) {
	var context = viewBroker.context
	clearBoundingBox(control.boundingBox, context)
	var meshBoundingBox = viewer.meshBoundingBox
	var size = getSubtraction3D(meshBoundingBox[1], meshBoundingBox[0])
	var y = 2 * viewBroker.textSpace
	setTextContext(context)
	drawArrays(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
	context.fillText('Size', viewBroker.analysisSizeBegin, viewBroker.textSpace)
	drawNumericArrays(context, size, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	context.fillText('Lower', viewBroker.analysisLowerBegin, viewBroker.textSpace)
	drawNumericArrays(context, meshBoundingBox[0], viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
	context.fillText('Upper', viewBroker.analysisUpperBegin, viewBroker.textSpace)
	drawNumericArrays(context, meshBoundingBox[1], viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
}

function addEdgeExistenceMap(mesh) {
	var edgeMap = new Map()
	var facets = mesh.facets
	var normals = new Array(facets.length)
	mesh.edgeMap = edgeMap
	mesh.existenceSet = new Set()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var normal = getNormalByFacet(facet, mesh.points)
		var polygon = getPolygonByFacet(facet, mesh.points)
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[(vertexIndex + 1) % facet.length].toString())
			if (normal == undefined) {
				edgeMap.set(key, [new Array(3).fill(1.0 / Math.sqrt(3.0)), undefined, undefined])
			}
			else {
				addElementToMapArray(edgeMap, edgeKey, normal)
			}
		}
	}

	for (var key of edgeMap.keys()) {
		var value = edgeMap.get(key)
		var normal = value[0]
		if (value.length == 2) {
			var otherNormal = value[1]
			var existence = distanceSquared3D(normal, otherNormal) > gCloseSquared
			if (existence) {
				normal = getAddition3D(normal, otherNormal)
				var normalLength = length3D(normal)
				if (normalLength == 0.0) {
					normal = otherNormal
					existence = false
				}
				else {
					normal = divide3DScalar(normal, normalLength)
				}
			}
			if (existence) {
				mesh.existenceSet.add(key)
			}
		}
		edgeMap.set(key, normal)
	}

	for (var key of edgeMap.keys()) {
		var normal = edgeMap.get(key)
		var red = 128 + 87 * Math.abs(normal[0]) + 40 * (normal[0] < -gClose)
		var green = 128 + 87 * Math.abs(normal[1]) + 40 * (normal[1] > gClose)
		var blue = 128 + 87 * Math.abs(normal[2]) + 40 * (normal[2] > gClose)
		edgeMap.set(key, 'rgb(' + Math.floor(red).toFixed() + ', ' + Math.floor(green).toFixed() + ', ' + Math.floor(blue).toFixed() + ')')
	}
}

function drawMesh(control, viewer) {
	var context = viewBroker.context
	drawGridSpacing(context, getHeightMinusOverScale(viewer) * gGridSpacingMultiplier, viewer.gridControl.selectedState)
	var mesh = viewer.mesh
	if (viewer.type.indexOf('Triang') != -1) {
		if (viewer.triangleMesh == undefined) {
			viewer.triangleMesh = getTriangleMesh(mesh)
		}
		mesh = viewer.triangleMesh
	}
	else {
		if (viewer.type.indexOf('Convex') != -1) {
			if (viewer.convexMesh == undefined) {
				viewer.convexMesh = {facets:getAllConvexFacets(mesh), points:mesh.points}
			}
			mesh = viewer.convexMesh
		}
	}

	if (mesh.edgeMap == undefined) {
		addEdgeExistenceMap(mesh)
	}

	var boundingBox = control.boundingBox
	var facets = mesh.facets
	var zPolygons = []
	var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
	clearBoundingBoxClip(boundingBox, context)
	var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
	if (viewer.gridControl.selectedState) {
		drawMeshGrid(boundingBox, canvasRotationMatrix, context, viewer)
	}

	context.fillStyle = '#e0e0e0'
	context.lineWidth = 0.7
	context.strokeStyle = 'black'
	if (getIsSlice(viewer)) {
		drawSlice(canvasPoints, control, mesh, viewer)
		context.restore()
		return
	}

	for (var facet of facets) {
		var zPolygon = [new Array(facet.length), facet]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zPolygon[0][vertexIndex] = canvasPoints[facet[vertexIndex]][2]
		}
		zPolygon[0].sort(compareNumberDescending)
		if (viewer.type[0] == 'S') {
			if (getIsClockwise(getPolygonByFacet(facet, canvasPoints))) {
				zPolygons.push(zPolygon)
			}
		}
		else {
			zPolygons.push(zPolygon)
		}
	}

	zPolygons.sort(compareArrayAscending)
	var oldFillStyle = context.fillStyle
	for (var zPolygonIndex = 0; zPolygonIndex < zPolygons.length; zPolygonIndex++) {
		context.beginPath()
		var facet = zPolygons[zPolygonIndex][1]
		if (viewer.colorControl.selectedState) {
			var normal = getNormalByFacet(facet, mesh.points)
			if (normal != undefined) {
				var red = 128 + 87 * Math.abs(normal[0]) + 40 * (normal[0] < -gClose)
				var green = 128 + 87 * Math.abs(normal[1]) + 40 * (normal[1] > gClose)
				var blue = 128 + 87 * Math.abs(normal[2]) + 40 * (normal[2] > gClose)
				var colorString = 'rgb(' + red + ', ' + green + ', ' + blue + ')'
				if (viewer.type[0] == 'S') {
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
		if (viewer.type[0] == 'S') {
			context.fill()
		}
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
			var edgeKey = getEdgeKey(pointIndex.toString(), nextPointIndex.toString())
			var hasAll = viewer.type.indexOf(' All') != -1
			var hasEdge = hasAll
			if (!hasEdge) {
				hasEdge = mesh.existenceSet.has(edgeKey)
			}
			if (hasEdge && (viewer.type.indexOf(' Edge') != -1 || hasAll)) {
				context.strokeStyle = 'black'
			}
			else {
				if (viewer.colorControl.selectedState) {
					context.strokeStyle = mesh.edgeMap.get(edgeKey)
				}
				else {
					context.strokeStyle = oldFillStyle
				}
			}
			if (hasEdge || viewer.type != 'Wireframe Polyhedral Outline') {
				drawLine(context, canvasPoints[pointIndex], canvasPoints[nextPointIndex])
			}
		}
	}

	context.restore()
}

function drawMeshByViewer() {
	drawMesh(viewBroker.view.meshControl, viewBroker.view)
}

function drawMeshGrid(boundingBox, canvasRotationMatrix, context, viewer) {
	var heightMinusOver = getHeightMinusOverScale(viewer)
	var gridSpacing = getIntegerStep(heightMinusOver * gGridSpacingMultiplier)
	var directionIndex = getMatrixDirectionIndex(viewer.rotationMatrix)
	var halfDirectionIndex = Math.floor(directionIndex / 2)
	var xDimension = [2, 0, 0][halfDirectionIndex]
	var yDimension = [1, 2, 1][halfDirectionIndex]
	var zDimension = [0, 1, 2][halfDirectionIndex]
	var directionXOver = -viewer.centerOffset[xDimension] / gridSpacing
	var directionYOver = -viewer.centerOffset[yDimension] / gridSpacing
	heightMinusOver /= gridSpacing
	var halfGridSpacing = 0.5 * gridSpacing
	var floorX = gridSpacing * Math.floor(directionXOver - heightMinusOver)
	var ceilX = gridSpacing * Math.ceil(directionXOver + heightMinusOver)
	var floorY = gridSpacing * Math.floor(directionYOver - heightMinusOver)
	var ceilY = gridSpacing * Math.ceil(directionYOver + heightMinusOver)
	context.lineWidth = 0.7
	if (viewer.colorControl.selectedState) {
		context.lineWidth = 1.7
		context.strokeStyle = ['#b06060', '#e07070', '#60b060', '#70e070', '#6060b0', '#7070e0'][directionIndex]
	}
	else {
		context.strokeStyle = 'black'
	}

	var z = -viewer.centerOffset[zDimension]
	for (var x = floorX; x < ceilX + halfGridSpacing; x += gridSpacing) {
		var bottom = [z, z, z]
		bottom[xDimension] = x
		bottom[yDimension] = floorY
		var top = [z, z, z]
		top[xDimension] = x
		top[yDimension] = ceilY
		drawLine(get3DBy3DMatrix(context, canvasRotationMatrix, bottom), get3DBy3DMatrix(canvasRotationMatrix, top))
	}

	for (var y = floorY; y < ceilY + halfGridSpacing; y += gridSpacing) {
		var left = [z, z, z]
		left[xDimension] = floorX
		left[yDimension] = y
		var right = [z, z, z]
		right[xDimension] = ceilX
		right[yDimension] = y
		drawLine(get3DBy3DMatrix(context, canvasRotationMatrix, left), get3DBy3DMatrix(canvasRotationMatrix, right))
	}
}

function drawSlice(canvasPoints, control, mesh, viewer) {
	var context = viewBroker.context
	if (viewer.colorControl.selectedState) {
		var directionIndex = getMatrixDirectionIndex(viewer.rotationMatrix)
		var colorString = ['#d78080', '#ff8080', '#80d780', '#80ff80', '#8080d7', '#8080ff'][directionIndex]
		if (viewer.type[0] == 'S') {
			context.fillStyle = colorString
		}
		else {
			context.strokeStyle = colorString
		}
	}
	sliceControl = viewer.sliceControl
	var rangeZ = getRangeZ(canvasPoints)
	var sliderPortion = (sliceControl.value - sliceControl.lower) / (sliceControl.upper - sliceControl.lower)
	var z = rangeZ.differenceZ * sliceControl.value + rangeZ.lowerZ
	if (viewer.convexMesh == undefined) {
		viewer.convexMesh = {facets:getAllConvexFacets(mesh), points:mesh.points}
	}
	var polygons = getSlicePolygonsByZ({facets:viewer.convexMesh.facets, points:canvasPoints}, z)
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
		if (viewer.type[0] == 'S') {
			context.fill()
		}
	}
	context.restore()
}

function getCanvasRotationMatrix(viewer) {
	return getMultiplied3DMatrix(viewBroker.canvasCenterMatrix, getCenterRotationMatrix(viewer))
}

function getCenterRotationMatrix(viewer) {
	var zoomScalePoint = getMultiplication3DScalar(viewer.scalePoint, getExponentialZoom())
	var scaleCenterMatrix = getMultiplied3DMatrix(getMatrix3DByScale3D(zoomScalePoint), getMatrix3DByTranslate(viewer.centerOffset))
	return getMultiplied3DMatrix(viewer.rotationMatrix, scaleCenterMatrix)
}

function getHeightMinusOverScale(viewer) {
	return getHeightMinusOverZoom() / viewer.scale
}

function getIsSlice(viewer) {
	sliceControl = viewer.sliceControl
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

function meshMouseOut(viewer) {
	viewer.rotationMatrix = viewer.lastRotationMatrix
	drawMeshByViewer()
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function meshMouseUp(viewer) {
	viewBroker.mouseMoveManipulator = undefined
	viewBroker.mouseDown2D = undefined
	viewer.last = undefined
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

function mouseDownInspection(control, event, viewer) {
	var mesh = viewer.mesh
	if (mesh.points.length == 0 || viewBroker.mouseDown2D == undefined || getIsSlice(viewer)) {
		return
	}
	var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
	var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
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
	if (viewer.last != undefined) {
		change = getSubtraction3D(mousePoint, viewer.last)
		change.push(length3D(change))
		if (change[3] < gClose) {
			return
		}
	}
	var boundingBox = viewer.inspectBoundingBox
	var context = viewBroker.context
	clearBoundingBox(boundingBox, context)
	setTextContext(context)
	var boundingBoxTopPlus = boundingBox[0][1] + viewBroker.textSpace
	var y = boundingBoxTopPlus + viewBroker.textSpace
	drawArrays(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
	context.fillText('Mouse', viewBroker.analysisSizeBegin, boundingBoxTopPlus)
	drawNumericArrays(context, mousePoint, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	if (viewer.last != undefined) {
		context.fillText('Last', viewBroker.analysisLowerBegin, boundingBoxTopPlus)
		drawNumericArrays(context, viewer.last, viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
		context.fillText('Change', viewBroker.analysisUpperBegin, boundingBoxTopPlus)
		drawNumericArrays(context, change, viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
	}
	viewer.last = mousePoint
}

function mouseDownMesh(control, event, viewer) {
	var parent = viewer.inspectControl.parent
	if (parent.control == viewer.inspectControl) {
		if (parent.selectedIndex == 0) {
			mouseDownInspection(control, event, viewer)
			return
		}
		viewBroker.mouseDownCenterOffset = viewer.centerOffset
		viewer.lastRotationMatrix = viewer.rotationMatrix
		if (parent.selectedIndex == 1) {
			viewBroker.mouseMoveManipulator = moveMatrixManipulator
			return
		}
		viewBroker.mouseMoveManipulator = swivelMatrixManipulator
		return
	}

	setViewerToTurn(viewer)
	if (parent.selectedIndex == 0) {
		viewBroker.mouseMoveManipulator = turnManipulator
	}
	else {
		viewBroker.mouseMoveManipulator = stepTurnManipulator
	}
}

var moveMatrixManipulator = {
	mouseMove: function(event) {
		var mouseMovement = getMouseMovement(event)
		if (mouseMovement == undefined) {
			return
		}

		var viewer = viewBroker.view
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
		var viewer = viewBroker.view
		var mouseMoveNormal = viewBroker.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, viewer.mouseDownNegative)
		var stepRotation = Math.round(12.0 * Math.atan2(rotationXY[1], rotationXY[0]) / Math.PI) * Math.PI / 12.0
		var rotationZMatrix = getMatrix3DZByCosSin(Math.cos(stepRotation), Math.sin(stepRotation))
		viewer.rotationMatrix = getMultiplied3DMatrix(rotationZMatrix, viewer.lastRotationMatrix)
		drawMeshByViewer()
	},
	mouseOut: function(event) {
		meshMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		meshMouseUp(viewBroker.view)
	}
}

var swivelMatrixManipulator = {
	mouseMove: function(event) {
		var mouseMovement = getMouseMovementFlipped(event)
		if (mouseMovement == undefined) {
			return
		}

		var viewer = viewBroker.view
		var movementLength = length2D(mouseMovement)
		divide2DScalar(mouseMovement, movementLength)
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(mouseMovement), viewer.lastRotationMatrix)
		var rotationY = viewBroker.rotationMultiplier * movementLength
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DByRotateY([-rotationY]), viewer.rotationMatrix)
		mouseMovement[1] = -mouseMovement[1]
		viewer.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(mouseMovement), viewer.rotationMatrix)
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
		var viewer = viewBroker.view
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

function typeSelectChanged() {
	viewBroker.view.setType(document.getElementById('typeSelectID').selectedIndex)
	wordscapeViewerDraw()
}

function ViewMesh() {
	this.clearViewer = function() {
		document.getElementById('typeSelectID').hidden = true
	}
	this.draw = function() {
		if (this.rotationMatrix == undefined) {
			this.meshBoundingBox = getMeshBoundingBox(this.mesh)
			this.scale = viewBroker.modelDiameter / length3D(getSubtraction3D(this.meshBoundingBox[1], this.meshBoundingBox[0]))
			this.scalePoint = [this.scale, -this.scale, this.scale]
			this.centerOffset = multiply3DScalar(getAddition3D(this.meshBoundingBox[0], this.meshBoundingBox[1]), -0.5)
			this.rotationMatrix = getUnitMatrix3D()
			this.lastRotationMatrix = this.rotationMatrix
		}
		drawControls(this.controls, this)
	}
	this.mouseDown = function(event) {
		mouseDownControls(this.controls, event, this)
	}
	this.mouseMove = function(event) {
		if (viewBroker.mouseMoveManipulator != undefined) {
			viewBroker.mouseMoveManipulator.mouseMove(event)
		}
	}
	this.mouseOut = function(event) {
		if (viewBroker.mouseMoveManipulator != undefined) {
			viewBroker.mouseMoveManipulator.mouseOut(event)
		}
	}
	this.mouseUp = function(event) {
		if (viewBroker.mouseMoveManipulator != undefined) {
			viewBroker.mouseMoveManipulator.mouseUp(event)
		}
	}
	this.setType = function(typeSelectedIndex) {
		this.typeSelectedIndex = typeSelectedIndex
		this.type = this.types[typeSelectedIndex]
	}
	this.start = function() {
		var controls = []
		var controlWidth = viewBroker.controlWidth
		var height = viewBroker.canvas.height
		this.mesh = getMeshByID(this.id, viewBroker.registry)
		this.controls = controls
		var intervals = intervalsFromToQuantity(0.0, height, 4, false)
		for (var intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
			intervals[intervalIndex] = Math.round(intervals[intervalIndex])
		}
		this.controlBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		this.meshControl = {boundingBox:this.controlBoundingBox, draw:drawMesh, mouseDown:mouseDownMesh}
		controls.push(this.meshControl)
		var parent = {controls:[], selectedIndex:2}
		controls.push({boundingBox:[[0, 0], [intervals[0], controlWidth]], mouseDown:mouseDownAlign, text:'Align'})
		this.turnControl = getChoice([[intervals[0], 0], [intervals[2], controlWidth]], ['Turn', 'Step Turn'], parent)
		parent.controls.push(this.turnControl)
		this.colorControl = getCheckbox([[intervals[2], 0], [intervals[3], controlWidth]], 'Color')
		this.colorControl.controlChanged = drawMeshByViewer
		controls.push(this.colorControl)
		var analysisBottom = viewBroker.textSpace * 5
		var analysisBoundingBox = [[height, 0], [viewBroker.canvas.width, analysisBottom]]
		var analysisControl = {boundingBox:analysisBoundingBox, draw:drawAnalysis}
		controls.push(analysisControl)
		this.inspectBoundingBox = [[height, analysisBottom], [viewBroker.canvas.width, height]]
		var sliceBoundingBox = [[0, controlWidth], [controlWidth, viewBroker.heightMinus]]
		this.sliceControl = getVerticalSlider(sliceBoundingBox, 0.0, 'S', 1.0)
		this.sliceControl.controlChanged = drawMeshByViewer
		controls.push(this.sliceControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = getVerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawMeshByViewer
		controls.push(this.zoomControl)
		this.inspectControl = getChoice([[0, viewBroker.heightMinus], [intervals[2], height]], ['Inspect', 'Move', 'Swivel'], parent)
		parent.control = this.inspectControl
		parent.controls.push(this.inspectControl)
		pushArray(controls, parent.controls)
		this.gridControl = getCheckbox([[intervals[2], viewBroker.heightMinus], [height, height]], 'Grid', false)
		this.gridControl.controlChanged = drawMeshByViewer
		controls.push(this.gridControl)
		this.types = ['Solid Convex', 'Solid Convex Edge', 'Solid Convex All']
		pushArray(this.types, ['Solid Polyhedral', 'Solid Polyhedral Edge', 'Solid Polyhedral All'])
		pushArray(this.types, ['Solid Triangular', 'Solid Triangular Edge', 'Solid Triangular All'])
		pushArray(this.types, ['Wireframe Convex', 'Wireframe Polyhedral', 'Wireframe Polyhedral Outline', 'Wireframe Triangular'])
		this.typeSelectedIndex = getValueDefault(this.typeSelectedIndex, 1)
		this.type = this.types[this.typeSelectedIndex]
		setSelectToKeysIndexTitle(document.getElementById('typeSelectID'), this.types, this.typeSelectedIndex)
		this.setType(this.typeSelectedIndex)
	}
	this.updateViewer = function(isViewHidden) {
		document.getElementById('typeSelectID').hidden = isViewHidden
	}
}
