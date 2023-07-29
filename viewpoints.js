//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function convertPointToScreen(point, control, viewer) {
	add2D(point, viewer.centerOffset)
	subtract2D(point, control.halfSize)
	multiply2DScalar(point, getExponentialZoom())
	add2D(point, control.halfSize)
	point[0] += control.boundingBox[0][0]
	point[1] = control.boundingBox[1][1] - point[1]
	return point
}

function drawImageByControl(control, viewer) {
	if (viewer.filename == undefined) {
		return
	}

	if (viewer.image == undefined) {
		viewer.image = new Image()
		viewer.image.src = viewer.filename
	}

	if (viewer.image.complete) {
		if (viewer.lowerPoint == undefined) {
			var size = getSubtraction2D(control.boundingBox[1], control.boundingBox[0])
			var zoomRatio = 1.0 * size[1] / Math.max(viewer.image.naturalHeight, viewer.image.naturalWidth)
			viewer.height = zoomRatio * viewer.image.naturalHeight
			viewer.width = zoomRatio * viewer.image.naturalWidth
			multiply2DScalar(size, 0.5)
			viewer.lowerPoint = [size[0] - viewer.width * 0.5, viewer.height * 1.5 - size[1]]
		}
		var lowerScreen = getScreenByPoint(viewer.lowerPoint, control, viewer)
		var zoom = getExponentialZoom()
		viewBroker.context.drawImage(viewer.image, lowerScreen[0], lowerScreen[1], viewer.width * zoom, viewer.height * zoom)
	}
	else {
		viewer.image.onload = wordscapeViewerDraw
	}
}

function drawPoints(control, viewer) {
	var context = viewBroker.context
	drawGridSpacing(context, getHeightMinusOverZoom() * gGridSpacingMultiplier, viewer.gridControl.selectedState)
	var boundingBox = control.boundingBox
	clearBoundingBoxClip(boundingBox, context)
	drawImageByControl(control, viewer)
	if (viewer.gridControl.selectedState) {
		drawPointsGrid(control, context, viewer)
	}

	var lineWidth = 1.5 + 1.0 * viewer.colorControl.selectedState
	context.lineWidth = lineWidth
	context.strokeStyle = 'black'
	var points = viewer.points
	if (points.length > 0) {
		for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
			var begin = points[vertexIndex]
			var end = points[(vertexIndex + 1) % points.length]
			if (viewer.colorControl.selectedState) {
				setArrowStrokeStyle(begin, context, end)
			}
			drawLine(context, getScreenByPoint(begin, control, viewer), getScreenByPoint(end, control, viewer))
		}

		if (viewer.closestPointIndex != undefined) {
			context.lineWidth = 1.5
			context.strokeStyle = 'black'
			var marker = undefined
			var begin = points[(viewer.closestPointIndex + points.length - 1) % points.length]
			var center = points[viewer.closestPointIndex]
			var end = points[(viewer.closestPointIndex + 1) % points.length]
			var rotationVector = [0.0, 0.0]
			var beginCenter = getSubtraction2D(center, begin)
			var beginCenterLength = length2D(beginCenter)
			if (beginCenterLength > 0.0) {
				add2D(rotationVector, divide2DScalar(beginCenter, beginCenterLength))
			}
			var centerEnd = getSubtraction2D(end, center)
			var centerEndLength = length2D(centerEnd)
			if (centerEndLength > 0.0) {
				add2D(rotationVector, divide2DScalar(centerEnd, centerEndLength))
			}
			var rotationVectorLength = length2D(rotationVector)
			if (rotationVectorLength > gClose) {
				marker = [[6,0], [-6,4], [-6,-4]]
				divide2DScalar(rotationVector, rotationVectorLength)
				rotationVector[1] = -rotationVector[1]
				rotate2DsVector(marker, rotationVector)
			}
			else {
				marker = [[5,-5], [5,5], [-5,5], [-5,-5]]
			}
			add2Ds(marker, getScreenByPoint(center, control, viewer))
			for (var vertexIndex = 0; vertexIndex < marker.length; vertexIndex++) {
				drawLine(context, marker[vertexIndex], marker[(vertexIndex + 1) % marker.length])
			}
			context.lineWidth = lineWidth
		}
	}

	context.restore()
}

function drawPointsAnalysis(control, viewer) {
	var context = viewBroker.context
	clearBoundingBox(control.boundingBox, context)
	if (getIsEmpty(viewer.points)) {
		return
	}
	var boundingBox = getBoundingBox(viewer.points)
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	var titleTop = control.boundingBox[0][1] + viewBroker.textSpace
	var y = titleTop + viewBroker.textSpace
	setTextContext(context)
	drawArrays(context, 'X: Y:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
	context.fillText('Size', viewBroker.analysisSizeBegin, titleTop)
	drawNumericArrays(context, size, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	context.fillText('Lower', viewBroker.analysisLowerBegin, titleTop)
	drawNumericArrays(context, boundingBox[0], viewBroker.textSpace, viewBroker.analysisLowerBegin, y)
	context.fillText('Upper', viewBroker.analysisUpperBegin, titleTop)
	drawNumericArrays(context, boundingBox[1], viewBroker.textSpace, viewBroker.analysisUpperBegin, y)
}

function drawPointsByViewer() {
	drawPoints(viewBroker.view.pointsControl, viewBroker.view)
}

function drawPointsGrid(control, context, viewer) {
	var boundingBox = control.boundingBox
	var gridSpacing = getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier)
	var lowerOver = divide2DScalar(getPointByScreen(control, boundingBox[0], viewer), gridSpacing)
	var upperOver = divide2DScalar(getPointByScreen(control, boundingBox[1], viewer), gridSpacing)
	var halfGridSpacing = 0.5 * gridSpacing
	var floorX = gridSpacing * Math.floor(lowerOver[0])
	var ceilX = gridSpacing * Math.ceil(upperOver[0])
	var floorY = gridSpacing * Math.floor(upperOver[1])
	var ceilY = gridSpacing * Math.ceil(lowerOver[1])
	context.lineWidth = 0.7
	if (viewer.colorControl.selectedState) {
		context.lineWidth = 1.7
		context.strokeStyle = '#7070e0'
	}
	else {
		context.strokeStyle = 'black'
	}

	for (var x = floorX; x < ceilX + halfGridSpacing; x += gridSpacing) {
		drawLine(context, convertPointToScreen([x, floorY], control, viewer), convertPointToScreen([x, ceilY], control, viewer))
	}

	for (var y = floorY; y < ceilY + halfGridSpacing; y += gridSpacing) {
		drawLine(context, convertPointToScreen([floorX, y], control, viewer), convertPointToScreen([ceilX, y], control, viewer))
	}
}

function getFloatListsByStatementValue(registry, statement, value, valueIndexes, valueIsArrays) {
	var points = []
	var oldPoint = []
	var values = getValuesSetVariableMap(statement, value)
	valueIsArrays.length = values.length
	statement.variableMap.set('_points', points)
	for (var floatListIndex = 0; floatListIndex < values.length; floatListIndex++) {
		var floats = getFloatsUpdateByStatementValue(registry, statement, values[floatListIndex])[0]
		var isNestedArray = false
		if (Array.isArray(floats)) {
			if (floats.length > 0) {
				if (Array.isArray(floats[0])) {
					isNestedArray = true
				}
			}
		}
		valueIsArrays[floatListIndex] = isNestedArray
		if (isNestedArray) {
			pushArray(points, floats)
			pushArray(valueIndexes, new Array(floats.length).fill(floatListIndex))
		}
		else {
			setUndefinedElementsToArrayZero(floats, oldPoint)
			points.push(floats)
			valueIndexes.push(floatListIndex)
		}
		oldPoint = points[points.length - 1]
	}

	return points
}

function getMovePointString(closestValueIndex, manipulator, mouseMovementFlipped, values, viewer) {
	var addition = divide2DScalar(mouseMovementFlipped, getExponentialZoom())
	var valueString = values[closestValueIndex]
	var arrayCommaIndex = -1
	if (valueString.startsWith('Vector.getAddition2D')) {
		arrayCommaIndex = getIndexOfBracketed(valueString, ',', 1)
	}

	if (arrayCommaIndex == -1) {
		if (viewer.valueIsArrays[closestValueIndex]) {
			valueString = 'Vector.getAddition2Ds(' + valueString
		}
		else {
			var oldPoint = undefined
			if (manipulator.closestPointIndex > 0) {
				oldPoint = viewer.points[manipulator.closestPointIndex - 1]
			}
			var pointCommaIndex = getIndexOfBracketed(valueString, ',')
			if (pointCommaIndex != -1 && oldPoint != undefined) {
				var valueStrings = [valueString.slice(0, pointCommaIndex).trim(), valueString.slice(pointCommaIndex + 1).trim()]
				var secondCommaIndex = getIndexOfBracketed(valueStrings[1], ',')
				if (secondCommaIndex != -1) {
					valueStrings.push(valueStrings[1].slice(secondCommaIndex + 1).trim())
					valueStrings[1] = valueStrings[1].slice(0, secondCommaIndex).trim()
				}
				for (var parameterIndex = 0; parameterIndex < 2; parameterIndex++) {
					if (valueStrings[parameterIndex] == '') {
						valueStrings[parameterIndex] = oldPoint[parameterIndex].toString()
					}
				}
				valueString = valueStrings.join(',')
			}
			valueString = 'Vector.getAddition2D([' + valueString + ']'
		}
		return valueString + ', [' + addition.toString() + '])'
	}

	var afterComma = valueString.slice(arrayCommaIndex + 1, -1).trim()
	if (afterComma.startsWith('[')) {
		afterComma = afterComma.slice(1, -1)
	}

	add2D(addition, getFloatsUpdateByStatementValue(viewBroker.registry, viewer.lineStatement, afterComma)[0])
	return valueString.slice(0, arrayCommaIndex) + ', [' + addition.toString() + '])'
}

function getPointByEvent(control, event, viewer) {
	return getPointByScreen(control, [event.offsetX, event.offsetY], viewer)
}

function getPointByScreen(control, screenPoint, viewer) {
	var point = [screenPoint[0] - control.boundingBox[0][0], control.boundingBox[1][1] - screenPoint[1]]
	subtract2D(point, control.halfSize)
	divide2DScalar(point, getExponentialZoom())
	add2D(point, control.halfSize)
	return subtract2D(point, viewer.centerOffset)
}

function getScreenByPoint(point, control, viewer) {
	return convertPointToScreen(point.slice(0, 2), control, viewer)
}

function getValuesSetVariableMap(statement, value) {
	var values = getValues(value)
	var variableMap = getVariableMapByStatement(statement)
	variableMap.set('_values', values)
	return values
}

function locationMouseMove(event, viewer) {
	var point = getPointByEvent(viewer.pointsControl, event, viewer)
	var context = viewBroker.context
	var boundingBox = viewer.locationControl.boundingBox
	clearBoundingBox(boundingBox, context)
	var y = boundingBox[0][1] + viewBroker.textSpace
	setTextContext(context)
	drawArrays(context, 'X: Y:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
	drawNumericArrays(context, point, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	viewer.mouseMove2D = point
	updateClosestPointIndex()
}

function mouseDownPoints(control, event, viewer) {
	var name = getSelectedName(viewer.editControl.parent)
	var point = getPointByEvent(control, event, viewer)
	if (name == 'Add') {
		setPointsValueIndexes(viewer.lineStatement.attributeMap.get('points') + ' ' + point.toString())
		outputPointsDrawPoints(viewer)
		return
	}

	if (name == 'Delete') {
		var closestPointIndex = getClosestPointIndex(point, viewer.points)
		if (closestPointIndex == undefined) {
			return
		}
		var values = getValues(viewer.lineStatement.attributeMap.get('points'))
		values.splice(viewer.valueIndexes[closestPointIndex], 1)
		setPointsValueIndexes(values.join(' '))
		updateClosestPointIndex()
		outputPointsDrawPoints(viewer)
		return
	}

	if (name == 'Move Point') {
		if (viewBroker.view.points.length > 0) {
			viewBroker.mouseMoveManipulator = movePointManipulator
			movePointManipulator.closestPointIndex = getClosestPointIndex(point, viewer.points)
			movePointManipulator.oldPoints = getArraysCopy(viewer.points)
			movePointManipulator.oldValues = getValues(viewer.lineStatement.attributeMap.get('points'))
		}
		return
	}

	if (name == 'Inspect') {
		mouseDownPointsInspection(control, event, viewer)
		return
	}

	viewBroker.mouseDownCenterOffset = viewer.centerOffset
	viewBroker.mouseMoveManipulator = moveManipulator
}

function mouseDownPointsInspection(control, event, viewer) {
	if (viewer.points.length == 0 || viewBroker.mouseDown2D == undefined) {
		return
	}

	var closestPointIndex = getClosestPointIndex(getPointByEvent(control, event, viewer), viewer.points)
	var mousePoint = viewer.points[closestPointIndex]
	var change = null
	if (viewer.last != undefined) {
		change = getSubtraction2D(mousePoint, viewer.last)
		change.push(length2D(change))
		if (change[2] < gClose) {
			return
		}
	}

	var boundingBox = viewer.inspectBoundingBox
	var context = viewBroker.context
	clearBoundingBox(boundingBox, context)
	setTextContext(context)
	var boundingBoxTopPlus = boundingBox[0][1] + viewBroker.textSpace
	var y = boundingBoxTopPlus + viewBroker.textSpace
	drawArrays(context, 'X: Y:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
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

function mouseDownReverse(control, event, viewer) {
	viewer.points.reverse()
	outputPointsDrawPoints(viewer)
}

var moveManipulator = {
	mouseMove: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			return
		}

		var viewer = viewBroker.view
		viewer.centerOffset = getAddition2D(divide2DScalar(mouseMovementFlipped, getExponentialZoom()), viewBroker.mouseDownCenterOffset)
		drawPointsByViewer()
	},
	mouseOut: function(event) {
		viewBroker.view.centerOffset = viewBroker.mouseDownCenterOffset
		pointsMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			this.mouseOut(event)
			return
		}

		var viewer = viewBroker.view
		viewer.centerOffset = getAddition2D(divide2DScalar(mouseMovementFlipped, getExponentialZoom()), viewBroker.mouseDownCenterOffset)
		pointsMouseOut(viewer)
	}
}

function movePointByEvent(event, manipulator, mouseMovementFlipped, viewer) {
	if (!isPointInsideBoundingBox(viewer.pointsControl.boundingBox, [event.offsetX, event.offsetY])) {
		return
	}

	var closestValueIndex = viewer.valueIndexes[manipulator.closestPointIndex]
	var values = manipulator.oldValues.slice(0)
	values[closestValueIndex] = getMovePointString(closestValueIndex, manipulator, mouseMovementFlipped, values, viewer)
	setPointsValueIndexes(values.join(' '))
}

var movePointManipulator = {
	mouseMove: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			return
		}

		var viewer = viewBroker.view
		movePointByEvent(event, this, mouseMovementFlipped, viewer)
		pointsMouseMove(event, viewer)
	},
	mouseOut: function(event) {
		viewBroker.view.points = getArraysCopy(this.oldPoints)
		pointsMouseOut(viewBroker.view)
	},
	mouseUp: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			this.mouseOut(event)
			return
		}

		var viewer = viewBroker.view
		movePointByEvent(event, this, mouseMovementFlipped, viewer)
		pointsMouseUp(viewer)
	}
}

function outputPointsDrawPoints(viewer) {
	var fittedString = ''
	if (viewer.points.length > 0) {
		var boundingBox = getBoundingBox(viewer.points)
		var minimumPoint = boundingBox[0]
		var size = getSubtraction2D(boundingBox[1], minimumPoint)
		var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
		var multiplier = 100.0 / maximumDimension
		for (var fittedIndex = 0; fittedIndex < viewer.points.length; fittedIndex++) {
			var point = viewer.points[fittedIndex]
			var x = multiplier * (point[0] - minimumPoint[0])
			var y = multiplier * (point[1] - minimumPoint[1])
			fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
		}
	}

	console.log(fittedString)
	drawPointsAnalysis(viewer.analysisControl, viewer)
	drawPointsByViewer()
}

function pointsMouseMove(event, viewer) {
	drawPointsByViewer()
}

function pointsMouseOut(viewer) {
	drawPointsByViewer()
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function pointsMouseUp(viewer) {
	outputPointsDrawPoints(viewer)
	viewBroker.mouseMoveManipulator = undefined
	viewBroker.mouseDown2D = undefined
}

function setArrowStrokeStyle(begin, context, end) {
	var beginEnd = getSubtraction2D(end, begin)
	var beginEndLength = length2D(beginEnd)
	if (beginEndLength == 0.0) {
		return
	}

	divide2DScalar(beginEnd, beginEndLength)
	var red = 128 + 87 * Math.abs(beginEnd[1]) + 40 * (beginEnd[1] > -gClose)
	var blue = 128 + 87 * Math.abs(beginEnd[0]) + 40 * (beginEnd[0] > gClose)
	context.strokeStyle = 'rgb(' + red + ', 128, ' + blue + ')'
}

function setPointsValueIndexes(pointString) {
	var viewer = viewBroker.view
	var lineStatement = viewer.lineStatement
	lineStatement.attributeMap.set('points', pointString)
	document.getElementById('pointsInputID').value = pointString
	viewer.valueIndexes = []
	viewer.valueIsArrays = []
	viewer.points = getFloatListsByStatementValue(viewBroker.registry, lineStatement, pointString, viewer.valueIndexes, viewer.valueIsArrays)
}

function updateClosestPointIndex() {
	var closestPointIndex = undefined
	var viewer = viewBroker.view
	var point = viewer.mouseMove2D
	if (point == undefined) {
		return
	}

	if (viewer.points.length > 1) {
		var name = getSelectedName(viewer.editControl.parent)
		if (name == 'Move Point' || name == 'Delete' || name == 'Inspect') {
			closestPointIndex = getClosestPointIndex(point, viewer.points)
		}
	}

	if (viewer.closestPointIndex != closestPointIndex) {
		viewer.closestPointIndex = closestPointIndex
		drawPointsByViewer()
	}
}

function ViewPoints() {
	this.clearViewer = function() {
		document.getElementById('pointsID').hidden = true
		document.getElementById('pointsInputID').hidden = true
	}
	this.draw = function() {
		if (this.centerOffset == undefined) {
			this.centerOffset = [0.0, 0.0]
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
		locationMouseMove(event, this)
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
	this.points = []
	this.start = function() {
		var controls = []
		var controlWidth = viewBroker.controlWidth
		var height = viewBroker.canvas.height
		this.controls = controls
		var intervals = intervalsFromToQuantity(0.0, height, 4, false)
		for (var intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
			intervals[intervalIndex] = Math.round(intervals[intervalIndex])
		}

		var pointsBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		var halfSize = multiply2DScalar(getSubtraction2D(pointsBoundingBox[1], pointsBoundingBox[0]), 0.5)
		this.pointsControl = {boundingBox:pointsBoundingBox, draw:drawPoints, halfSize:halfSize, mouseDown:mouseDownPoints}
		controls.push(this.pointsControl)
		var parent = {controls:[], selectedIndex:0}
		this.editControl = getChoice([[0, 0], [intervals[2], controlWidth]], ['Add', 'Move Point', 'Delete'], parent)
		this.editControl.controlChanged = updateClosestPointIndex
		parent.control = this.editControl
		parent.controls.push(this.editControl)
		this.colorControl = getCheckbox([[intervals[2], 0], [intervals[3], controlWidth]], 'Color')
		this.colorControl.controlChanged = drawPointsByViewer
		controls.push(this.colorControl)
		var analysisBottom = viewBroker.textSpace * 4
		var analysisBoundingBox = [[height, 0], [viewBroker.canvas.width, analysisBottom]]
		this.analysisControl = {boundingBox:analysisBoundingBox, draw:drawPointsAnalysis}
		controls.push(this.analysisControl)
		var locationBoundingBox = [[height, analysisBottom], [viewBroker.canvas.width, analysisBottom + viewBroker.textSpace * 3]]
		this.locationControl = {boundingBox:locationBoundingBox}
		controls.push(this.locationControl)
		var reverseBoundingBox = [[intervals[1], viewBroker.heightMinus], [intervals[2], height]]
		controls.push({boundingBox:reverseBoundingBox, mouseDown:mouseDownReverse, text:'Reverse'})
		this.inspectBoundingBox = [[height, locationBoundingBox[1][1]], [viewBroker.canvas.width, height]]
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = getVerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawPointsByViewer
		controls.push(this.zoomControl)
		this.inspectControl = getChoice([[0, viewBroker.heightMinus], [intervals[1], height]], ['Inspect', 'Move'], parent)
		this.inspectControl.controlChanged = updateClosestPointIndex
		parent.controls.push(this.inspectControl)
		pushArray(controls, parent.controls)
		this.gridControl = getCheckbox([[intervals[2], viewBroker.heightMinus], [height, height]], 'Grid', false)
		this.gridControl.controlChanged = drawPointsByViewer
		controls.push(this.gridControl)
	}
	this.updateViewer = function(isViewHidden) {
		setPointsValueIndexes(this.lineStatement.attributeMap.get('points'))
		document.getElementById('pointsID').hidden = false
		document.getElementById('pointsInputID').hidden = false
	}
}
