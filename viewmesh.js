//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

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
		edgeMap.set(key, 'rgb(' + red.toFixed() + ',' + green.toFixed() + ',' + blue.toFixed() + ')')
	}
}

class DimensionMesh extends CanvasControl {
	constructor(boundingBox, text, selectedState) {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		var meshBoundingBox = view.meshBoundingBox
		var size = getSubtraction3D(meshBoundingBox[1], meshBoundingBox[0])
		var titleTop = view.analysisBoundingBox[0][1] + viewBroker.textSpace
		var y = titleTop + viewBroker.textSpace
		setTextContext(context)
		drawArrays(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
		context.fillText('Size', viewBroker.analysisSizeBegin, titleTop)
		drawNumericArrays(context, size, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
		context.fillText('Lower', viewBroker.analysisLowerBegin, titleTop)
		drawNumericArrays(context, meshBoundingBox[0], viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
		context.fillText('Upper', viewBroker.analysisUpperBegin, titleTop)
		drawNumericArrays(context, meshBoundingBox[1], viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
	}
	name = 'Dimension'
}

function drawMeshWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.view)
}

function drawMeshGrid(boundingBox, canvasRotationMatrix, context, view) {
	var heightMinusOver = getHeightMinusOverScale(view)
	var gridSpacing = getIntegerStep(heightMinusOver * gGridSpacingMultiplier)
	var directionIndex = getMatrixDirectionIndex(view.rotationMatrix)
	var halfDirectionIndex = Math.floor(directionIndex / 2)
	var xDimension = [2, 0, 0][halfDirectionIndex]
	var yDimension = [1, 2, 1][halfDirectionIndex]
	var zDimension = [0, 1, 2][halfDirectionIndex]
	var directionXOver = -view.centerOffset[xDimension] / gridSpacing
	var directionYOver = -view.centerOffset[yDimension] / gridSpacing
	heightMinusOver *= 2.0 / gridSpacing
	var halfGridSpacing = 0.5 * gridSpacing
	var floorX = gridSpacing * Math.floor(directionXOver - heightMinusOver)
	var ceilX = gridSpacing * Math.ceil(directionXOver + heightMinusOver)
	var floorY = gridSpacing * Math.floor(directionYOver - heightMinusOver)
	var ceilY = gridSpacing * Math.ceil(directionYOver + heightMinusOver)
	context.lineWidth = 0.7
	if (view.colorControl.getState()) {
		context.lineWidth = 1.7
		context.strokeStyle = ['#b06060', '#e07070', '#60b060', '#70e070', '#6060b0', '#7070e0'][directionIndex]
	}
	else {
		context.strokeStyle = 'black'
	}

	var z = -view.centerOffset[zDimension]
	for (var x = floorX; x < ceilX + halfGridSpacing; x += gridSpacing) {
		var bottom = [z, z, z]
		bottom[xDimension] = x
		bottom[yDimension] = floorY
		var top = [z, z, z]
		top[xDimension] = x
		top[yDimension] = ceilY
		drawLine(context, get3DByMatrix3D(bottom, canvasRotationMatrix), get3DByMatrix3D(top, canvasRotationMatrix))
	}

	for (var y = floorY; y < ceilY + halfGridSpacing; y += gridSpacing) {
		var left = [z, z, z]
		left[xDimension] = floorX
		left[yDimension] = y
		var right = [z, z, z]
		right[xDimension] = ceilX
		right[yDimension] = y
		drawLine(context, get3DByMatrix3D(left, canvasRotationMatrix), get3DByMatrix3D(right, canvasRotationMatrix))
	}
}

function drawMeshUpdateGrid() {
	drawMeshWithoutArguments()
	viewBroker.view.gridAnalysisControl.draw(viewBroker.view)
	viewBroker.view.gridControl.draw(viewBroker.view)
}

function drawSlice(canvasPoints, control, mesh, view) {
	var context = viewBroker.context
	if (view.colorControl.getState()) {
		var directionIndex = getMatrixDirectionIndex(view.rotationMatrix)
		var colorString = ['#d78080', '#ff8080', '#80d780', '#80ff80', '#8080d7', '#8080ff'][directionIndex]
		if (view.type[0] == 'S') {
			context.fillStyle = colorString
		}
		else {
			context.strokeStyle = colorString
		}
	}

	sliceControl = view.sliceControl
	var rangeZ = getRangeZ(canvasPoints)
	var sliderPortion = (sliceControl.value - sliceControl.lower) / (sliceControl.upper - sliceControl.lower)
	var z = rangeZ.differenceZ * sliceControl.value + rangeZ.lowerZ
	if (view.convexMesh == undefined) {
		view.convexMesh = {facets:getAllConvexFacets(mesh), points:mesh.points}
	}

	var polygons = getSlicePolygonsByZ({facets:view.convexMesh.facets, points:canvasPoints}, z)
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
		if (view.type[0] == 'S') {
			context.fill()
		}
	}

	context.restore()
}

function getCanvasRotationMatrix(view) {
	return getMultiplied3DMatrix(viewBroker.canvasCenterMatrix, getCenterRotationMatrix(view))
}

function getCenterRotationMatrix(view) {
	var zoomScalePoint = getMultiplication3DScalar(view.scalePoint, getExponentialZoom())
	var scaleCenterMatrix = getMultiplied3DMatrix(getMatrix3DByScale3D(zoomScalePoint), getMatrix3DByTranslate(view.centerOffset))
	var rotationScaleMatrix = getMultiplied3DMatrix(view.rotationMatrix, scaleCenterMatrix)
	return getMultiplied3DMatrix(getMatrix3DByScaleY([-1]), rotationScaleMatrix)
}

function getHeightMinusOverScale(view) {
	return getHeightMinusOverZoom() / view.scale
}

function getIsSlice(view) {
	sliceControl = view.sliceControl
	return sliceControl.value != sliceControl.lower && sliceControl.value != sliceControl.upper
}

function getMatrixDirectionIndex(matrix3D) {
	var directionIndex = 5
	var highestAxisProduct = get3DByMatrix3D([0.0, 0.0, 1.0], matrix3D)[2]
	if (highestAxisProduct < 0.0) {
		highestAxisProduct = -highestAxisProduct
		directionIndex = 4
	}

	var axisProductY = get3DByMatrix3D([0.0, 1.0, 0.0], matrix3D)[2]
	if (Math.abs(axisProductY) > highestAxisProduct) {
		directionIndex = 2
		if (axisProductY < 0.0) {
			axisProductY = -axisProductY
			directionIndex = 3
		}
		highestAxisProduct = axisProductY
	}

	var axisProductZ = get3DByMatrix3D([1.0, 0.0, 0.0], matrix3D)[2]
	if (Math.abs(axisProductZ) > highestAxisProduct) {
		directionIndex = 1
		if (axisProductZ > 0.0) {
			return 0
		}
	}

	return directionIndex
}

class GridAnalysisMesh extends CanvasControl {
	constructor(boundingBox, text, selectedState) {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		var titleTop = view.analysisBoundingBox[0][1] + viewBroker.textSpace
		setTextContext(context)
		var text = 'Grid Spacing: ' + getIntegerStep(getHeightMinusOverScale(view) * gGridSpacingMultiplier)
		context.fillText(text, viewBroker.analysisCharacterBegin, titleTop)
	}
	name = 'Grid'
}

class InspectMesh extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var mesh = view.mesh
		if (mesh.points.length == 0 || viewBroker.mouseDown2D == undefined || getIsSlice(view)) {
			return
		}

		var boundingBox = view.analysisBoundingBox
		var context = viewBroker.context
		clearBoundingBox(boundingBox, context)
		if (this.mousePoint == undefined) {
			return
		}

		setTextContext(context)
		var boundingBoxTopPlus = boundingBox[0][1] + viewBroker.textSpace
		var y = boundingBoxTopPlus + viewBroker.textSpace
		drawArrays(context, 'X: Y: Z:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
		context.fillText('Mouse', viewBroker.analysisSizeBegin, boundingBoxTopPlus)
		drawNumericArrays(context, this.mousePoint, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
		if (this.change == undefined) {
			return
		}

		context.fillText('Last', viewBroker.analysisLowerBegin, boundingBoxTopPlus)
		drawNumericArrays(context, this.lastDisplay, viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
		context.fillText('Change', viewBroker.analysisUpperBegin, boundingBoxTopPlus)
		drawNumericArrays(context, this.change, viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
	}
	name = 'Inspect'
}

class MeshControl extends CanvasControl {
	constructor(boundingBox) {
		super()
		this.boundingBox = boundingBox
		this.clipBox = boundingBox
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var mesh = view.mesh
		if (view.type.indexOf('Triang') != -1) {
			if (view.triangleMesh == undefined) {
				view.triangleMesh = getTriangleMesh(mesh)
			}
			mesh = view.triangleMesh
		}
		else {
			if (view.type.indexOf('Convex') != -1) {
				if (view.convexMesh == undefined) {
					view.convexMesh = {facets:getAllConvexFacets(mesh), points:mesh.points}
				}
				mesh = view.convexMesh
			}
		}

		if (mesh.edgeMap == undefined) {
			addEdgeExistenceMap(mesh)
		}

		var boundingBox = this.boundingBox
		var facets = mesh.facets
		var zPolygons = []
		var canvasRotationMatrix = getCanvasRotationMatrix(view)
		clearBoundingBox(boundingBox, context)
		var canvasPoints = get3DsByMatrix3D(mesh.points, canvasRotationMatrix)
		if (view.gridControl.getState()) {
			drawMeshGrid(boundingBox, canvasRotationMatrix, context, view)
		}

		context.fillStyle = '#e0e0e0'
		context.lineWidth = 0.7
		context.strokeStyle = 'black'
		if (getIsSlice(view)) {
			drawSlice(canvasPoints, control, mesh, view)
			context.restore()
			return
		}

		for (var facet of facets) {
			var zPolygon = [new Array(facet.length), facet]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				zPolygon[0][vertexIndex] = canvasPoints[facet[vertexIndex]][2]
			}
			zPolygon[0].sort(compareNumberDescending)
			if (view.type[0] == 'S') {
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
			var facet = zPolygons[zPolygonIndex][1]
			if (view.colorControl.getState()) {
				var normal = getNormalByFacet(facet, mesh.points)
				if (normal != undefined) {
					var red = 128 + 87 * Math.abs(normal[0]) + 40 * (normal[0] < -gClose)
					var green = 128 + 87 * Math.abs(normal[1]) + 40 * (normal[1] > gClose)
					var blue = 128 + 87 * Math.abs(normal[2]) + 40 * (normal[2] > gClose)
					var colorString = 'rgb(' + red.toFixed() + ',' + green.toFixed() + ',' + blue.toFixed() + ')'
					if (view.type[0] == 'S') {
						context.fillStyle = colorString
					}
					else {
						context.strokeStyle = colorString
					}
				}
			}
			if (view.type[0] == 'S') {
				context.beginPath()
				moveToPoint(context, canvasPoints[facet[0]])
				for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
					lineToPoint(context, canvasPoints[facet[vertexIndex]])
				}
				context.closePath()
				context.fill()
			}
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
				var edgeKey = getEdgeKey(pointIndex.toString(), nextPointIndex.toString())
				var hasAll = view.type.indexOf(' All') != -1
				var hasEdge = hasAll
				if (!hasEdge) {
					hasEdge = mesh.existenceSet.has(edgeKey)
				}
				if (hasEdge && (view.type.indexOf(' Edge') != -1 || hasAll)) {
					context.strokeStyle = 'black'
				}
				else {
					if (view.colorControl.getState()) {
						context.strokeStyle = mesh.edgeMap.get(edgeKey)
					}
					else {
						context.strokeStyle = oldFillStyle
					}
				}
				if (hasEdge || view.type != 'Wireframe Polyhedral Outline') {
					drawLine(context, canvasPoints[pointIndex], canvasPoints[nextPointIndex])
				}
			}
		}
	}
	mouseDownPrivate(event, view) {
		var name = getSelectedName(view.editControl)
		if (name == 'Inspect') {
			mouseDownMeshInspect(this, event, view)
			return
		}

		viewBroker.mouseDownCenterOffset = view.centerOffset
		view.lastRotationMatrix = view.rotationMatrix
		if (name == 'Move') {
			viewBroker.mouseMoveManipulator = moveMatrixManipulator
			return
		}

		if (name == 'Swivel') {
			viewBroker.mouseMoveManipulator = swivelMatrixManipulator
			return
		}

		setViewToTurn(view)
		if (name == 'Turn') {
			viewBroker.mouseMoveManipulator = turnManipulator
		}
		else {
			viewBroker.mouseMoveManipulator = stepTurnManipulator
		}
	}
}

function meshMouseOut(view) {
	view.rotationMatrix = view.lastRotationMatrix
	drawMeshWithoutArguments()
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function meshMouseUp(view) {
	viewBroker.mouseMoveManipulator = undefined
	viewBroker.mouseDown2D = undefined
	view.last = undefined
	view.lastRotationMatrix = view.rotationMatrix
}

function mouseDownAlign(control, event, view) {
	var highestTransformed = null
	var highestZ = -Number.MAX_VALUE
	var rotationMatrix = view.rotationMatrix
	for (var direction of gDirections) {
		var transformed = get3DByMatrix3D(direction, rotationMatrix)
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
		var transformed = get3DByMatrix3D(direction, rotationMatrix)
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
	drawMeshWithoutArguments()
}

function mouseDownMeshInspect(control, event, view) {
	var mesh = view.mesh
	if (mesh.points.length == 0 || viewBroker.mouseDown2D == undefined || getIsSlice(view)) {
		return
	}

	var inspectControl = view.inspectControl
	view.analysisControl.selectedIndex = 2
	view.analysisControl.drawPrivate(view)
	var canvasRotationMatrix = getCanvasRotationMatrix(view)
	var canvasPoints = get3DsByMatrix3D(mesh.points, canvasRotationMatrix)
	var rangeZ = getRangeZ(canvasPoints)
	var multiplierZ = 0.0
	if (rangeZ.differenceZ > 0.0) {
		multiplierZ = 1.0 / rangeZ.differenceZ
	}

	var closestPointIndex = undefined
	var closestDistanceSquared = Number.MAX_VALUE
	for (var pointIndex = 0; pointIndex < mesh.points.length; pointIndex++) {
		var canvasPoint = canvasPoints[pointIndex]
		var distanceSquared = distanceSquared2D(canvasPoint, viewBroker.mouseDown2D) + multiplierZ * (rangeZ.upperZ - canvasPoint[2])
		if (distanceSquared < closestDistanceSquared) {
			closestDistanceSquared = distanceSquared
			closestPointIndex = pointIndex
		}
	}

	inspectControl.mousePoint = mesh.points[closestPointIndex]
	inspectControl.change = undefined
	if (inspectControl.last != undefined) {
		inspectControl.change = getSubtraction3D(inspectControl.mousePoint, inspectControl.last)
		inspectControl.change.push(length3D(inspectControl.change))
		inspectControl.lastDisplay = inspectControl.last
		if (inspectControl.change[3] < gClose) {
			inspectControl.change = undefined
		}
	}

	inspectControl.draw(view)
	inspectControl.last = inspectControl.mousePoint
}

var moveMatrixManipulator = {
	mouseMove: function(event) {
		var mouseMovement = getMouseMovement(event)
		if (mouseMovement == undefined) {
			return
		}

		var view = viewBroker.view
		var inverseMatrix3D = getInverseRotation3D(getCenterRotationMatrix(view))
		mouseMovement.push(0.0)
		var invertedMovement = get3DByMatrix3D(mouseMovement, inverseMatrix3D)
		view.centerOffset = getAddition3D(invertedMovement, viewBroker.mouseDownCenterOffset)
		drawMeshWithoutArguments()
	},
	mouseOut: function(event) {
		meshMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		meshMouseUp(viewBroker.view)
	}
}

function setViewToTurn(view) {
	view.mouseDownNegative = viewBroker.getOffsetNormal(event)
	view.mouseDownNegative[1] = -view.mouseDownNegative[1]
	view.lastRotationMatrix = view.rotationMatrix
}

var stepTurnManipulator = {
	mouseMove: function(event) {
		var view = viewBroker.view
		var mouseMoveNormal = viewBroker.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, view.mouseDownNegative)
		var stepRotation = Math.round(12.0 * Math.atan2(rotationXY[1], rotationXY[0]) / Math.PI) * Math.PI / 12.0
		var rotationZMatrix = getMatrix3DZByCosSin(Math.cos(stepRotation), Math.sin(stepRotation))
		view.rotationMatrix = getMultiplied3DMatrix(rotationZMatrix, view.lastRotationMatrix)
		drawMeshWithoutArguments()
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
		var mouseMovement = getMouseMovement(event)
		if (mouseMovement == undefined) {
			return
		}

		var view = viewBroker.view
		var movementLength = length2D(mouseMovement)
		divide2DScalar(mouseMovement, movementLength)
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(mouseMovement), view.lastRotationMatrix)
		var rotationY = viewBroker.rotationMultiplier * movementLength
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DByRotateY([-rotationY]), view.rotationMatrix)
		mouseMovement[1] = -mouseMovement[1]
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(mouseMovement), view.rotationMatrix)
		drawMeshWithoutArguments()
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
		var view = viewBroker.view
		var mouseMoveNormal = viewBroker.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, view.mouseDownNegative)
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(rotationXY), view.lastRotationMatrix)
		drawMeshWithoutArguments()
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
	wordscapeViewDraw()
}

function ViewMesh() {
	this.clearView = function() {
		document.getElementById('typeSelectID').hidden = true
	}
	this.draw = function() {
		if (this.rotationMatrix == undefined) {
			this.meshBoundingBox = getMeshBoundingBox(this.mesh)
			this.scale = viewBroker.modelDiameter / length3D(getSubtraction3D(this.meshBoundingBox[1], this.meshBoundingBox[0]))
			this.scalePoint = [this.scale, this.scale, this.scale]
			this.centerOffset = multiply3DScalar(getAddition3D(this.meshBoundingBox[0], this.meshBoundingBox[1]), -0.5)
			this.rotationMatrix = this.viewTransform3D.slice(0)
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
		var valueMap = viewBroker.valueMap
		var width = viewBroker.canvas.width
		this.mesh = getMeshByID(this.id, viewBroker.registry)
		this.controls = controls
		var intervals = intervalsFromToQuantity(0.0, height, 5, false)
		intervals.forEach(Math.round)

		var bottomIntervals = intervalsFromToQuantity(0.0, height, 2, false)
		bottomIntervals.forEach(Math.round)
		var alignButton = new Button([[0.0, viewBroker.heightMinus], [bottomIntervals[0], height]], 'Align')
		alignButton.onClick = mouseDownAlign
		controls.push(alignButton)
		var colorBoundingBox = [[bottomIntervals[0], viewBroker.heightMinus], [bottomIntervals[1], height]]
		this.colorControl = new Checkbox(colorBoundingBox, 'Color', getKeyMapDefault('meshColor', valueMap, true))
		this.colorControl.controlChanged = drawMeshWithoutArguments
		controls.push(this.colorControl)

		var sliceBoundingBox = [[0, controlWidth], [controlWidth, viewBroker.heightMinus]]
		this.sliceControl = new VerticalSlider(sliceBoundingBox, 0.0, 'S', 1.0)
		this.sliceControl.controlChanged = drawMeshWithoutArguments
		controls.push(this.sliceControl)
		this.viewBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		this.viewControl = new MeshControl(this.viewBoundingBox)
		controls.push(this.viewControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawMeshUpdateGrid
		controls.push(this.zoomControl)

		var texts = ['Swivel', 'Step Turn', 'Turn', 'Inspect', 'Move']
		this.editControl = new Choice([[0, 0], [intervals[4], controlWidth]], texts)
		controls.push(this.editControl)

		this.analysisControl = new Choice([[height, 0], [width, controlWidth]], ['Dimension', 'Grid', 'Inspect'])
		this.analysisControl.controlChanged = drawAnalysisControls
		controls.push(this.analysisControl)
		var analysisBottom = controlWidth
		this.analysisBoundingBox = [[height, analysisBottom], [width, height]]
		this.dimensionControl = new DimensionMesh()
		this.gridAnalysisControl = new GridAnalysisMesh()
		this.inspectControl = new InspectMesh()
		this.gridAnalysisBottom = analysisBottom + viewBroker.textSpace
		var gridControlTop = this.gridAnalysisBottom + viewBroker.halfTextSpace
		var gridBoundingBox = [[height, gridControlTop], [height + (width - height) / 3.0, gridControlTop + controlWidth]]
		this.gridControl = new Checkbox(gridBoundingBox, 'Grid', getKeyMapDefault('meshGrid', valueMap, false))
		this.gridControl.controlChanged = drawMeshUpdateGrid
		this.gridControl.name = 'Grid'
		this.analysisControls = [this.dimensionControl, this.gridAnalysisControl, this.inspectControl, this.gridControl]
		for (var analysisControl of this.analysisControls) {
			analysisControl.displayFunction = controlIsAnalysisName
		}
		pushArray(controls, this.analysisControls)

		this.types = ['Solid Convex', 'Solid Convex Edge', 'Solid Convex All']
		pushArray(this.types, ['Solid Polyhedral', 'Solid Polyhedral Edge', 'Solid Polyhedral All'])
		pushArray(this.types, ['Solid Triangular', 'Solid Triangular Edge', 'Solid Triangular All'])
		pushArray(this.types, ['Wireframe Convex', 'Wireframe Polyhedral', 'Wireframe Polyhedral Outline', 'Wireframe Triangular'])
		this.typeSelectedIndex = getValueDefault(this.typeSelectedIndex, 1)
		this.type = this.types[this.typeSelectedIndex]
		setSelectToKeysIndexTitle(document.getElementById('typeSelectID'), this.types, this.typeSelectedIndex)
		this.setType(this.typeSelectedIndex)
	}
	this.updateView = function(isViewHidden) {
		document.getElementById('typeSelectID').hidden = isViewHidden
	}
}
