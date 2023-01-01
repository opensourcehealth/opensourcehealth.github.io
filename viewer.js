//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function clearBoundingBox(boundingBox, context) {
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	context.clearRect(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
}

function clearFillBoundingBox(boundingBox, context) {
	clearBoundingBox(boundingBox, context)
	context.fillStyle = '#f0f0f0'
	fillRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
	context.lineWidth = 1.0
	context.strokeStyle = 'black'
	strokeRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
}

function drawAnalysis(control, viewer) {
	var context = viewer.context
	clearBoundingBox(control.boundingBox, context)
	var meshBoundingBox = viewer.view.meshBoundingBox
	var size = getSubtraction3D(meshBoundingBox[1], meshBoundingBox[0])
	var y = 2 * viewer.textSpace
	setTextContext(context)
	context.textAlign = 'left'
	drawArray(context, 'X: Y: Z:'.split(' '), viewer.textSpace, viewer.analysisCharacterStart, y)
	context.fillText('Size', viewer.analysisSizeStart, viewer.textSpace)
	drawNumericArray(context, size, viewer.textSpace, viewer.analysisSizeStart, y)
	context.fillText('Lower', viewer.analysisLowerStart, viewer.textSpace)
	drawNumericArray(context, meshBoundingBox[0], viewer.textSpace, viewer.analysisLowerStart, y)
	context.fillText('Upper', viewer.analysisUpperStart, viewer.textSpace)
	drawNumericArray(context, meshBoundingBox[1], viewer.textSpace, viewer.analysisUpperStart, y)
}

function drawArray(context, elements, textSpace, x, y) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length > 0) {
				var text = element[0]
				for (var parameterIndex = 1; parameterIndex < element.length; parameterIndex++) {
					text += ', ' + element[parameterIndex]
				}
				context.fillText(text, x, y)
			}
		}
		else {
			context.fillText(element, x, y)
		}
		y += textSpace
	}
}

function drawCheckbox(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewer.context
	clearFillBoundingBox(boundingBox, context)
	var outset = 10
	var left = boundingBox[0][0] + 0.6 * outset
	var width = control.size[1] - 2 * outset
	var checkboxTop = boundingBox[0][1] + outset
	setTextContext(context)
	context.textAlign = 'center'
	context.fillText(control.text, 0.5 * (left + width + boundingBox[1][0]), boundingBox[1][1] - viewer.textControlLift)
	context.lineWidth = 1.0
	if (control.selectedState) {
		context.beginPath()
		moveToPoint(context, [left, checkboxTop + 0.7 * width])
		lineToPoint(context, [left + 0.05 * width, checkboxTop + 0.65 * width])
		lineToPoint(context, [left + 0.45 * width, checkboxTop + 0.85 * width])
		lineToPoint(context, [left + 0.95 * width, checkboxTop - 0.2 * width])
		lineToPoint(context, [left + width, checkboxTop - 0.15 * width])
		lineToPoint(context, [left + 0.5 * width, checkboxTop + 1.2 * width])
		context.closePath()
		context.fillStyle = 'green'
		context.strokeStyle = 'green'
		context.stroke()
		context.fill()
	}
	else {
		strokeRoundRect(left, checkboxTop, context, left + width, checkboxTop + width, 1)
	}
}

function drawChoice(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewer.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'center'
	for (var textIndex = 0; textIndex < control.texts.length; textIndex++) {
		var text = control.texts[textIndex]
		context.fillText(text, control.choiceWidth * (textIndex + 0.5), boundingBox[1][1] - viewer.textControlLift)
	}
	context.lineWidth = 1.0
	var left = boundingBox[0][0] + control.selectedIndex * control.choiceWidth
	strokeRoundRect(left + 2, boundingBox[0][1] + 2, context, left + control.choiceWidth - 2, boundingBox[1][1] - 2)
}

function drawControl(control, viewer) {
	if (control.text != undefined) {
		drawControlText(control.boundingBox, control.text, viewer)
	}
	if (control.draw != undefined) {
		control.draw(control, viewer)
	}
}

function drawControlText(boundingBox, text, viewer) {
	var context = viewer.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'center'
	context.fillText(text, 0.5 * (boundingBox[0][0] + boundingBox[1][0]), boundingBox[1][1] - viewer.textControlLift)
}

function drawGrid(boundingBox, canvasRotationMatrix, context, viewer) {
	var view = viewer.view
	var directionIndex = getMatrixDirectionIndex(view.rotationMatrix)
	var halfDirectionIndex = Math.floor(directionIndex / 2)
	var xDimension = [2, 0, 0][halfDirectionIndex]
	var yDimension = [1, 2, 1][halfDirectionIndex]
	var zDimension = [0, 1, 2][halfDirectionIndex]
	var heightMinusOver = 1.8 * viewer.halfHeightMinus / view.scale / viewer.zoomControl.value
	var step = getIntegerStep(0.2 * heightMinusOver)
	var directionXOver = -view.centerOffset[xDimension] / step
	var directionYOver = -view.centerOffset[yDimension] / step
	heightMinusOver /= step
	var halfStep = 0.5 * step
	var floorX = step * Math.floor(directionXOver - heightMinusOver)
	var ceilX = step * Math.ceil(directionXOver + heightMinusOver)
	var ceilXPlus = ceilX + halfStep
	var floorY = step * Math.floor(directionYOver - heightMinusOver)
	var ceilY = step * Math.ceil(directionYOver + heightMinusOver)
	var ceilYPlus = ceilY + halfStep
	if (viewer.colorControl.selectedState) {
		context.fillStyle = ['#b06060', '#e07070', '#60b060', '#70e070', '#6060b0', '#7070e0'][directionIndex]
	}
	else {
		context.fillStyle = '#c0c0c0'
	}
	var z = -view.centerOffset[zDimension]
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
	var context = viewer.context
	var view = viewer.view
	var mesh = getViewMesh(viewer)
	if (viewer.type.indexOf('T') != -1) {
		if (view.triangleMesh == null) {
			view.triangleMesh = getTriangleMesh(mesh)
		}
		mesh = view.triangleMesh
	}
	var boundingBox = control.boundingBox
	var facets = mesh.facets
	var zPolygons = []
	var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
	clearBoundingBox(boundingBox, context)
	context.save()
	var region = new Path2D()
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	region.rect(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
	context.clip(region)
	context.strokeStyle = 'black'
	var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
	if (viewer.gridControl.selectedState) {
		drawGrid(boundingBox, canvasRotationMatrix, context, viewer)
	}
	context.fillStyle = '#e0e0e0'
	if (viewer.type[0] == 'S') {
		context.lineWidth = 2.0
	}
	else {
		context.lineWidth = 1.0
	}
	if (getIsSlice(viewer)) {
		drawSlice(canvasPoints, control, mesh, viewer)
		return
	}
	for (var facet of facets) {
		var zPolygon = [new Array(facet.length), facet]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zPolygon[0][vertexIndex] = canvasPoints[facet[vertexIndex]][2]
		}
		zPolygon[0].sort(compareNumberDescending)
		if (viewer.type[0] == 'S') {
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
		if (viewer.colorControl.selectedState) {
			var normal = getNormalByFacet(facet, mesh.points)
			if (normal != null) {
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
		context.stroke()
		if (viewer.type[0] == 'S') {
			context.fill()
		}
	}
	context.restore()
}

function drawMeshByViewer(viewer) {
	drawMesh(viewer.meshControl, viewer)
}

function drawNumericArray(context, elements, textSpace, x, y) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length > 0) {
				var text = element[0].toFixed()
				for (var parameterIndex = 1; parameterIndex < element.length; parameterIndex++) {
					text += ', ' + element[parameterIndex].toFixed()
				}
				context.fillText(text, x, y)
			}
		}
		else {
			context.fillText(element.toFixed(), x, y)
		}
		y += textSpace
	}
}

function drawOutsetLine(begin, context, end, outset) {
	var beginEnd = getSubtraction2D(end, begin)
	var beginEndLength = length2D(beginEnd)
	if (beginEndLength == 0.0) {
		return
	}
	multiply2DScalar(beginEnd, outset / beginEndLength)
	var right = [beginEnd[1], -beginEnd[0]]
	var left = [-right[0], -right[1]]
	var endBegin = [-beginEnd[0], -beginEnd[1]]
	var beginOutset = getAddition2D(begin, endBegin)
	var endOutset = getAddition2D(end, beginEnd)
	context.beginPath()
	moveToPoint(context, getAddition2D(beginOutset, left))
	lineToPoint(context, getAddition2D(beginOutset, right))
	lineToPoint(context, getAddition2D(endOutset, right))
	lineToPoint(context, getAddition2D(endOutset, left))
	context.closePath()
	context.fill()
}

function drawSlice(canvasPoints, control, mesh, viewer) {
	var context = viewer.context
	var view = viewer.view
	if (viewer.colorControl.selectedState) {
		var directionIndex = getMatrixDirectionIndex(view.rotationMatrix)
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
	if (view.triangleMesh == null) {
		view.triangleMesh = getTriangleMesh(mesh)
	}
	var polygons = getSlicePolygonsByZ({facets:view.triangleMesh.facets, points:canvasPoints}, z)
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

function drawVerticalSlider(control, viewer) {
	var context = viewer.context
	var thumbUpper = control.thumbUpperBase + control.rangeOverValue * (control.value - control.lower)
	var thumbY = thumbUpper + control.thumbRadius
	context.beginPath()
	context.arc(control.midX, control.columnUpper + control.columnRadius, control.columnRadius, -Math.PI, 0.0)
	context.lineTo(control.midX + control.columnRadius, thumbY)
	context.lineTo(control.midX - control.columnRadius, thumbY)
	context.closePath()
	context.fillStyle = '#c0c0c0'
	context.fill()
	context.beginPath()
	context.arc(control.midX, control.rangeLower - control.columnRadius, control.columnRadius, 0.0, Math.PI)
	context.lineTo(control.midX - control.columnRadius, thumbY)
	context.lineTo(control.midX + control.columnRadius, thumbY)
	context.closePath()
	context.fillStyle = '#f0c32e'
	context.fill()
	context.beginPath()
	context.arc(control.midX, thumbY, control.thumbRadius, 0.0, gDoublePi)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function drawViewImage(control, viewer) {
	var view = viewer.view
	if (view.image == null) {
		view.image = new Image()
		view.image.src = view.filename
	}
	clearBoundingBox(control.boundingBox, viewer.context)
	if (view.image.complete) {
		if (view.height == null) {
			var greatestDimension = Math.max(view.image.naturalHeight, view.image.naturalWidth)
			var zoomRatio = 1.0 * viewer.canvas.height / greatestDimension
			view.height = zoomRatio * view.image.naturalHeight
			view.width = zoomRatio * view.image.naturalWidth
			view.halfCanvasMinus = viewer.halfWidth - view.width / 2
			view.canvasHeightMinus = viewer.canvas.height - view.height
		}
		viewer.context.drawImage(view.image, view.halfCanvasMinus, view.canvasHeightMinus, view.width, view.height)
	}
	else {
		view.image.onload = wordscapeViewerDraw
	}
	viewer.mouseMoveManipulator = imageManipulator
}

function fillRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.fill()
}

function getCanvasRotationMatrix(viewer) {
	return getMultiplied3DMatrix(viewer.canvasCenterMatrix, getCenterRotationMatrix(viewer))
}

function getCenterRotationMatrix(viewer) {
	var view = viewer.view
	var zoomScalePoint = getMultiplication3DScalar(view.scalePoint, viewer.zoomControl.value)
	var scaleCenterMatrix = getMultiplied3DMatrix(getMatrix3DByScale3D(zoomScalePoint), getMatrix3DByTranslate(view.centerOffset))
	return getMultiplied3DMatrix(view.rotationMatrix, scaleCenterMatrix)
}

function getCheckbox(boundingBox, text, selectedState) {
	selectedState = getValueByDefault(true, selectedState)
	var control = {boundingBox:boundingBox, draw:drawCheckbox, mouseDown:mouseDownCheckbox, selectedState:selectedState, text:text}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	return control
}

function getChoice(boundingBox, texts, selectedIndex) {
	selectedIndex = getValueByDefault(0, selectedIndex)
	var control = {boundingBox:boundingBox, draw:drawChoice, mouseDown:mouseDownChoice, selectedIndex:selectedIndex, texts:texts}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	control.choiceWidth = control.size[0] / texts.length
	return control
}

function getIntegerStep(step) {
	var powerTen = Math.pow(10.0, Math.floor(Math.log10(step)))
	step /= powerTen
	if (step < 2.0) {
		return powerTen
	}
	if (step < 5.0) {
		return 2.0 * powerTen
	}
	return 5.0 * powerTen
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

function getRangeZ(points) {
	var rangeZ = {upperZ:points[0][2]}
	rangeZ.lowerZ = rangeZ.upperZ
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		var z = points[pointIndex][2]
		rangeZ.lowerZ = Math.min(rangeZ.lowerZ, z)
		rangeZ.upperZ = Math.max(rangeZ.upperZ, z)
	}
	rangeZ.differenceZ = rangeZ.upperZ - rangeZ.lowerZ
	return rangeZ
}

function getVerticalSlider(boundingBox, lower, text, upper, value) {
	value = getValueByDefault(lower, value)
	var control = 	{boundingBox:boundingBox,
	draw:drawVerticalSlider, mouseDown:mouseDownVerticalSlider, lower:lower, text:text, upper:upper, value:value}
	var boundingBox = control.boundingBox
	control.width = boundingBox[1][0] - boundingBox[0][0]
	control.columnRadius = 0.15 * control.width
	var columnSpace = 0.5 * control.width - control.columnRadius
	control.midX = 0.5 * (control.boundingBox[0][0] + control.boundingBox[1][0])
	control.thumbWidth = control.width - columnSpace
	control.thumbRadius = 0.5 * control.thumbWidth
	control.rangeLower = boundingBox[1][1] - control.width
	control.columnUpper = boundingBox[0][1] + columnSpace
	control.thumbUpperBase = control.rangeLower - control.thumbWidth
	control.rangeOverValue = (control.columnUpper - control.thumbUpperBase) / (control.upper - control.lower)
	return control
}

function getViewMesh(viewer) {
	var view = viewer.view
	if (view.mesh == null) {
		view.mesh = getWorkMeshByID(view.id, viewer.registry)
	}
	return view.mesh
}

function lineToPoint(context, point) {
	context.lineTo(point[0], point[1])
}

function meshMouseOut(viewer) {
	viewer.view.rotationMatrix = viewer.view.lastRotationMatrix
	drawMeshByViewer(viewer)
	viewer.mouseDown2D = null
	viewer.mouseMoveManipulator = null
}

function meshMouseUp(event, mouseMoveManipulator, viewer) {
	viewer.mouseMoveManipulator = null
	viewer.mouseDown2D = null
	viewer.choiceControl.last = undefined
	viewer.view.lastRotationMatrix = viewer.view.rotationMatrix
}

function moveToPoint(context, point) {
	context.moveTo(point[0], point[1])
}

function mouseDownAlign(control, event, viewer) {
	var highestTransformed = null
	var highestZ = -Number.MAX_VALUE
	var view = viewer.view
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
	drawMeshByViewer(viewer)
}

function mouseDownCheckbox(control, event, viewer) {
	control.selectedState = !control.selectedState
	if (control.controlChanged != undefined) {
		control.controlChanged(viewer)
	}
	drawCheckbox(control, viewer)
}

function mouseDownChoice(control, event, viewer) {
	control.selectedIndex = Math.floor((event.offsetX - control.boundingBox[0][0]) / control.choiceWidth)
	control.selectedIndex = Math.max(control.selectedIndex, 0)
	control.selectedIndex = Math.min(control.selectedIndex, control.texts.length - 1)
	drawChoice(control, viewer)
}

function mouseDownImage(control, event, viewer) {
	var view = viewer.view
	view.polyline.push(viewer.mouseDown2D)
	var boundingBox = getBoundingBox(view.polyline)
	var minimumPoint = boundingBox[0]
	var size = getSubtraction2D(boundingBox[1], minimumPoint)
	var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
	var fittedString = ''
	var multiplier = 100.0 / maximumDimension
	for (var fittedIndex = 0; fittedIndex < view.polyline.length; fittedIndex++) {
		var point = view.polyline[fittedIndex]
		var x = multiplier * (point[0] - minimumPoint[0])
		var y = multiplier * (boundingBox[1][1] - point[1])
		fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
	}
	console.log(fittedString)
}

function mouseDownStepTurn(control, event, viewer) {
	viewer.mouseDownNegative = viewer.getOffsetNormal(event)
	viewer.mouseDownNegative[1] = -viewer.mouseDownNegative[1]
	viewer.view.lastRotationMatrix = viewer.view.rotationMatrix
	viewer.mouseMoveManipulator = stepTurnManipulator
}

function mouseDownSwivel(control, event, viewer) {
	if (viewer.choiceControl.selectedIndex == 0) {
		var mesh = getViewMesh(viewer)
		if (mesh.points.length == 0 || viewer.mouseDown2D == null || getIsSlice(viewer)) {
			return
		}
		var canvasRotationMatrix = getCanvasRotationMatrix(viewer)
		var canvasPoints = get3DsBy3DMatrix(canvasRotationMatrix, mesh.points)
		var context = viewer.context
		var rangeZ = getRangeZ(canvasPoints)
		var multiplierZ = 0.0
		if (rangeZ.differenceZ > 0.0) {
			multiplierZ = 1.0 / rangeZ.differenceZ
		}
		var closestPointIndex = null
		var closestDistanceSquared = Number.MAX_VALUE
		for (var pointIndex = 0; pointIndex < mesh.points.length; pointIndex++) {
			var canvasPoint = canvasPoints[pointIndex]
			var distanceSquared = distanceSquared2D(canvasPoint, viewer.mouseDown2D) + multiplierZ * (rangeZ.upperZ - canvasPoint[2])
			if (distanceSquared < closestDistanceSquared) {
				closestDistanceSquared = distanceSquared
				closestPointIndex = pointIndex
			}
		}
		var mousePoint = mesh.points[closestPointIndex]
		var change = null
		if (viewer.choiceControl.last != undefined) {
			change = getSubtraction3D(mousePoint, viewer.choiceControl.last)
			change.push(length3D(change))
			if (change[3] < gClose) {
				return
			}
		}
		clearBoundingBox(viewer.inspectBoundingBox, context)
		setTextContext(context)
		context.textAlign = 'left'
		var y = 2 * viewer.textSpace + viewer.analysisBottom
		drawArray(context, 'X: Y: Z:'.split(' '), viewer.textSpace, viewer.analysisCharacterStart, y)
		context.fillText('Mouse', viewer.analysisSizeStart, viewer.textSpace + viewer.analysisBottom)
		drawNumericArray(context, mousePoint, viewer.textSpace, viewer.analysisSizeStart, y)
		if (viewer.choiceControl.last != undefined) {
			context.fillText('Last', viewer.analysisLowerStart, viewer.textSpace + viewer.analysisBottom)
			drawNumericArray(context, viewer.choiceControl.last, viewer.textSpace, viewer.analysisLowerStart, y)
			context.fillText('Change', viewer.analysisUpperStart, viewer.textSpace + viewer.analysisBottom)
			drawNumericArray(context, change, viewer.textSpace, viewer.analysisUpperStart, y)
		}
		viewer.choiceControl.last = mousePoint
		return
	}
	var view = viewer.view
	viewer.mouseDownCenterOffset = view.centerOffset
	view.lastRotationMatrix = view.rotationMatrix
	viewer.mouseMoveManipulator = swivelManipulator
}

function mouseDownTurn(control, event, viewer) {
	viewer.mouseDownNegative = viewer.getOffsetNormal(event)
	viewer.mouseDownNegative[1] = -viewer.mouseDownNegative[1]
	viewer.view.lastRotationMatrix = viewer.view.rotationMatrix
	viewer.mouseMoveManipulator = turnManipulator
}

function mouseDownVerticalSlider(control, event, viewer) {
	var thumbUpper = control.thumbUpperBase + control.rangeOverValue * (control.value - control.lower)
	var thumbMinimum = [control.thumbLeft, thumbUpper]
	var thumbBox = [thumbMinimum, add2D([control.thumbWidth, control.thumbWidth], thumbMinimum)]
	if (isPointInsideBoundingBox(thumbBox, meshViewer.mouseDown2D)) {
		control.mouseDownValue = control.value
		sliderManipulator.control = control
		viewer.mouseMoveManipulator = sliderManipulator
	}
}

function roundRectPath(beginX, beginY, context, endX, endY, outset) {
	outset = getValueByDefault(8, outset)
	context.beginPath()
	context.arc(endX - outset, beginY + outset, outset, -0.5 * Math.PI, 0.0)
	context.lineTo(endX, endY - outset)
	context.arc(endX - outset, endY - outset, outset, 0.0, 0.5 * Math.PI)
	context.lineTo(beginX + outset, endY)
	context.arc(beginX + outset, endY - outset, outset, 0.5 * Math.PI, Math.PI)
	context.lineTo(beginX, beginY + outset)
	context.arc(beginX + outset, beginY + outset, outset, Math.PI, 1.5 * Math.PI)
	context.closePath()
}

function setTextContext(context) {
	context.font = '12px Palatino'
	context.fillStyle = 'black'
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

function strokeRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.stroke()
}

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function typeSelectChanged() {
	meshViewer.setType(document.getElementById('typeSelectID').selectedIndex)
	drawMesh(meshViewer.meshControl, meshViewer)
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
	meshViewer.mouseDown2D = [event.offsetX, event.offsetY]
	for (var control of meshViewer.view.controls) {
		if (control.mouseDown != undefined) {
			if (isPointInsideBoundingBox(control.boundingBox, meshViewer.mouseDown2D)) {
				control.mouseDown(control, event, meshViewer)
				return
			}
		}
	}
}

function viewerMouseMove(event) {
	if (meshViewer.view != null && meshViewer.mouseMoveManipulator != null) {
		meshViewer.mouseMoveManipulator.mouseMove(event, meshViewer)
	}
}

function viewerMouseOut(event) {
	if (meshViewer.view != null && meshViewer.mouseMoveManipulator != null) {
		meshViewer.mouseMoveManipulator.mouseOut(event, meshViewer)
	}
}

function viewerMouseUp(event) {
	if (meshViewer.view != null && meshViewer.mouseMoveManipulator != null) {
		meshViewer.mouseMoveManipulator.mouseUp(event, meshViewer)
	}
}

function viewSelectChanged() {
	var viewSelect = document.getElementById('viewSelectID')
	meshViewer.setView(viewSelect.selectedIndex)
	meshViewer.draw()
}

function wordscapeViewerDraw() {
	meshViewer.draw()
}


var meshViewer = {
	addImage: function(filename, id) {
		this.views.push({filename:filename, height:null, id:id, image:null, isMesh:false, controls:this.imageControls, polyline:[]})
	},
	addMesh: function(id, matrix3D) {
		if (getWorkMeshByID(id, this.registry) != null) {
			this.views.push(
			{id:id, isMesh:true, matrix3D:matrix3D, mesh:null, controls:this.meshControls, rotationMatrix:null, triangleMesh:null})
		}
	},
	draw: function() {
		var view = this.view
		if (view == null) {
			return
		}
		for (var control of view.controls) {
			drawControl(control, this)
		}
	},
	getOffsetNormal: function(event) {
		return normalize2D([event.offsetX - this.halfWidth, event.offsetY - this.halfHeight])
	},
	initialize: function() {
		this.canvasID = null
		this.controlWidth = 32
		this.imageControls = []
		this.meshControls = []
		this.mouseMoveManipulator = null
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.textControlLift = this.controlWidth / 2 - 0.4 * this.textHeight
		this.doubleTextSpace = this.textSpace + this.textSpace
		this.viewID = null
		this.typeSelectedIndex = 0
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
		this.mouseDown2D = null
		this.registry = registry
		this.triangleMesh = null
		this.types = ['Solid Polyhedral', 'Solid Triangular', 'Wireframe Polyhedral', 'Wireframe Triangular']
		this.type = this.types[this.typeSelectedIndex]
		this.view = null
		this.views = []
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
		this.view.meshBoundingBox = getMeshBoundingBox(getWorkMeshByID(this.viewID, this.registry))
		this.view.scale = this.modelDiameter / length3D(getSubtraction3D(this.view.meshBoundingBox[1], this.view.meshBoundingBox[0]))
		this.view.scalePoint = [this.view.scale, -this.view.scale, this.view.scale]
		this.view.centerOffset = multiply3DScalar(getAddition3D(this.view.meshBoundingBox[0], this.view.meshBoundingBox[1]), -0.5)
		this.view.rotationMatrix = getUnitMatrix3D()
		this.view.lastRotationMatrix = this.view.rotationMatrix
	},
	start: function(height) {
		this.canvas.height = height
		this.canvas.width = height + 17.0 * this.textHeight
		var isDisabled = (this.views.length == 0)
		document.getElementById(this.canvasID).hidden = isDisabled
		document.getElementById('typeSelectID').disabled = isDisabled
		document.getElementById('viewSelectID').disabled = isDisabled
		updateView()
		if (this.views.length == 0) {
			return
		}
		this.context = this.canvas.getContext('2d')
		this.context.lineJoin = 'round'
		this.halfHeight = height / 2
		this.halfHeightMinus = this.halfHeight - this.controlWidth
		this.halfWidth = height / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelDiameter = height - 2.0 * this.controlWidth
		this.canvasCenterMatrix = getMatrix3DByTranslate(this.canvasCenter)
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
		var heightMinus = height - this.controlWidth
		var intervals = intervalsFromToQuantity(0.0, height, 4, false)
		for (var intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
			intervals[intervalIndex] = Math.round(intervals[intervalIndex])
		}
		this.imageControls.length = 0
		this.meshControls.length = 0
		this.meshControls.push({boundingBox:[[0, 0], [intervals[0], this.controlWidth]], mouseDown:mouseDownAlign, text:'Align'})
		this.meshControls.push(
		{boundingBox:[[intervals[0], 0], [intervals[1], this.controlWidth]], mouseDown:mouseDownStepTurn, text:'Step Turn'})
		this.meshControls.push(
		{boundingBox:[[intervals[1], 0], [intervals[2], this.controlWidth]], mouseDown:mouseDownTurn, text:'Turn'})
		this.colorControl = getCheckbox([[intervals[2], 0], [intervals[3], this.controlWidth]], 'Color')
		this.colorControl.controlChanged = drawMeshByViewer
		this.meshControls.push(this.colorControl)
		this.analysisBottom = 5 * this.textSpace
		var analysisBoundingBox = [[height, 0], [this.canvas.width, this.analysisBottom]]
		var analysisControl = {boundingBox:analysisBoundingBox, draw:drawAnalysis}
		this.analysisCharacterStart = analysisBoundingBox[0][0] + 0.5 * this.textHeight
		this.analysisSizeStart = analysisBoundingBox[0][0] + 2 * this.textHeight
		this.analysisLowerStart = analysisBoundingBox[0][0] + 7 * this.textHeight
		this.analysisUpperStart = analysisBoundingBox[0][0] + 12 * this.textHeight
		this.meshControls.push(analysisControl)
		this.inspectBoundingBox = [[height, this.analysisBottom], [this.canvas.width, height]]
		var controlBoundingBox = [[this.controlWidth, this.controlWidth], [heightMinus, heightMinus]]
		this.meshControl = {boundingBox:controlBoundingBox, draw:drawMesh, mouseDown:mouseDownSwivel}
		this.meshControls.push(this.meshControl)
		var sliceBoundingBox = [[0, this.controlWidth], [this.controlWidth, heightMinus]]
		this.sliceControl = getVerticalSlider(sliceBoundingBox, 0.0, 'S', 1.0)
		this.sliceControl.controlChanged = drawMeshByViewer
		this.meshControls.push(this.sliceControl)
		var zoomBoundingBox = [[heightMinus, this.controlWidth], [height, heightMinus]]
		this.zoomControl = getVerticalSlider(zoomBoundingBox, 1.0, 'Z', 5.0)
		this.zoomControl.controlChanged = drawMeshByViewer
		this.meshControls.push(this.zoomControl)
		this.choiceControl = getChoice([[0, heightMinus], [intervals[2], height]], ['Inspect', 'Move', 'Swivel'], 2)
		this.meshControls.push(this.choiceControl)
		this.gridControl = getCheckbox([[intervals[2], heightMinus], [height, height]], 'Grid', false)
		this.gridControl.controlChanged = drawMeshByViewer
		this.meshControls.push(this.gridControl)
		var imageBoundingBox = [[0, 0], [height, height]]
		this.imageControl = {boundingBox:imageBoundingBox, draw:drawViewImage, mouseDown:mouseDownImage}
		this.imageControls.push(this.imageControl)
		this.draw()
	}
}

var imageManipulator = {
	mouseMove: function(event, viewer) {
		var characterStart = viewer.analysisCharacterStart
		var context = viewer.context
		context.clearRect(characterStart, 0, viewer.canvas.width, viewer.doubleTextSpace + 1)
		setTextContext(context)
		context.textAlign = 'left'
		context.fillText('x :  ' + event.offsetX, characterStart, viewer.textSpace)
		context.fillText('y :  ' + event.offsetY, characterStart, viewer.doubleTextSpace)
	},
	mouseOut: function(event, viewer) {
	},
	mouseUp: function(event, viewer) {
	}
}

var sliderManipulator = {
	drawControlSlider: function(viewer) {
		drawControl(this.control, viewer)
		if (this.control.controlChanged != undefined) {
			this.control.controlChanged(viewer)
		}
	},
	mouseMove: function(event, viewer) {
		var deltaY = event.offsetY - meshViewer.mouseDown2D[1]
		this.control.value = this.control.mouseDownValue + deltaY / this.control.rangeOverValue
		this.control.value = Math.max(this.control.value, this.control.lower)
		this.control.value = Math.min(this.control.value, this.control.upper)
		this.drawControlSlider(viewer)
	},
	mouseOut: function(event, viewer) {
		this.control.value = this.control.mouseDownValue
		this.drawControlSlider(viewer)
		viewer.mouseDownCenterOffset = null
		viewer.mouseDown2D = null
		viewer.mouseMoveManipulator = null
	},
	mouseUp: function(event, viewer) {
		viewer.mouseDownCenterOffset = null
		viewer.mouseDown2D = null
		viewer.mouseMoveManipulator = null
	}
}

var stepTurnManipulator = {
	mouseMove: function(event, viewer) {
		var mouseMoveNormal = viewer.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, viewer.mouseDownNegative)
		var stepRotation = Math.round(12.0 * Math.atan2(rotationXY[1], rotationXY[0]) / Math.PI) * Math.PI / 12.0
		var rotationZMatrix = getMatrix3DZByCosSin(Math.cos(stepRotation), Math.sin(stepRotation))
		viewer.view.rotationMatrix = getMultiplied3DMatrix(rotationZMatrix, viewer.view.lastRotationMatrix)
		drawMeshByViewer(viewer)
	},
	mouseOut: function(event, viewer) {
		meshMouseOut(viewer)
	},
	mouseUp: function(event, viewer) {
		meshMouseUp(event, this, viewer)
	}
}

var swivelManipulator = {
	mouseMove: function(event, viewer) {
		if (viewer.mouseDown2D == null) {
			return
		}
		var mouseMovement = [event.offsetX - viewer.mouseDown2D[0], event.offsetY - viewer.mouseDown2D[1]]
		var movementLength = length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		if (viewer.choiceControl.selectedIndex == 0) {
			return
		}
		var view = viewer.view
		if (viewer.choiceControl.selectedIndex == 1) {
			var inverseMatrix3D = getInverseRotation3D(getCenterRotationMatrix(viewer))
			mouseMovement.push(0.0)
			var invertedMovement = get3DBy3DMatrix(inverseMatrix3D, mouseMovement)
			view.centerOffset = getAddition3D(invertedMovement, viewer.mouseDownCenterOffset)
			drawMeshByViewer(viewer)
			return
		}
		var movementNormal = divide2DScalar(mouseMovement.slice(0), movementLength)
		movementNormal[1] = -movementNormal[1]
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), view.lastRotationMatrix)
		var rotationY = viewer.rotationMultiplier * movementLength
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DByRotateY([-rotationY]), view.rotationMatrix)
		movementNormal[1] = -movementNormal[1]
		view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(movementNormal), view.rotationMatrix)
		drawMeshByViewer(viewer)
	},
	mouseOut: function(event, viewer) {
		meshMouseOut(viewer)
	},
	mouseUp: function(event, viewer) {
		meshMouseUp(event, this, viewer)
	}
}

var turnManipulator = {
	mouseMove: function(event, viewer) {
		var mouseMoveNormal = viewer.getOffsetNormal(event)
		var rotationXY = getRotation2DVector(mouseMoveNormal, viewer.mouseDownNegative)
		viewer.view.rotationMatrix = getMultiplied3DMatrix(getMatrix3DRotatedBy2D(rotationXY), viewer.view.lastRotationMatrix)
		drawMeshByViewer(viewer)
	},
	mouseOut: function(event, viewer) {
		meshMouseOut(viewer)
	},
	mouseUp: function(event, viewer) {
		meshMouseUp(event, this, viewer)
	}
}

meshViewer.initialize()
