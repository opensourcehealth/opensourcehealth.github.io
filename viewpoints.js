//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gActionColorMap = new Map([['Delete', 'red'], ['Inspect', 'green']])

function addParameterControl(closestValueIndex, functionValues, parameterIndex, polylineDefinitionsKey, values, view) {
	var polylineDefinitions = gPolylineDefinitionsMap.get(polylineDefinitionsKey)
	if (parameterIndex >= polylineDefinitions.length) {
		return
	}

	var polylineControl = view.polylineControl
	var polylineDefinition = polylineDefinitions[parameterIndex]
	if (polylineDefinition == undefined) {
		return
	}

	var functionValue = functionValues[parameterIndex]
	if (polylineDefinition.checked != undefined) {
		var parameter = polylineDefinition.checked
		if (!getIsEmpty(functionValue)) {
			parameter = getBooleanByStatementValue(undefined, viewBroker.registry, view.lineStatement, functionValue)
		}
		var nextTitleTop = polylineControl.titleTop + Checkbox.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		polylineControl.titleTop = nextTitleTop
		var parameterControl = new Checkbox(boundingBox, polylineDefinition.text, parameter)
		parameterControl.closestValueIndex = closestValueIndex
		parameterControl.controlChanged = modifyBoolean
		parameterControl.defaultState = polylineDefinition.checked
		parameterControl.functionValues = functionValues
		parameterControl.oldValues = values
		parameterControl.parameterIndex = parameterIndex
		parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
		completeParameterControl(parameterControl, view)
		return
	}

	if (polylineDefinition.point != undefined) {
		var parameter = polylineDefinition.point
		if (!getIsEmpty(functionValue)) {
			parameter = getPoint2DByStatementValue(undefined, viewBroker.registry, view.lineStatement, functionValue)
		}
		var lower = getValueDefault(polylineDefinition.lower, -360.0)
		var upper = getValueDefault(polylineDefinition.upper, 360.0)
		var nextTitleTop = polylineControl.titleTop + HorizontalSliderPoint.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		polylineControl.titleTop = nextTitleTop
		var parameterControl = new HorizontalSliderPoint(boundingBox, lower, polylineDefinition.text, upper, parameter)
		parameterControl.closestValueIndex = closestValueIndex
		parameterControl.controlChanged = modifyPoint
		parameterControl.decimalPlaces = polylineDefinition.decimalPlaces
		var sliders = parameterControl.sliders
		for (var sliderIndex = 0; sliderIndex < Math.min(sliders.length, polylineDefinition.point.length); sliderIndex++) {
			sliders[sliderIndex].defaultValue = polylineDefinition.point[sliderIndex]
		}
		parameterControl.functionValues = functionValues
		parameterControl.oldFunctionValues = parameterControl.functionValues.slice(0)
		parameterControl.oldParameter = parameter
		parameterControl.oldValues = values
		parameterControl.parameterIndex = parameterIndex
		parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
		completeParameterControl(parameterControl, view)
		return
	}

	var parameter = polylineDefinition.value
	if (!getIsEmpty(functionValue)) {
		parameter = getFloatByStatementValue(undefined, viewBroker.registry, view.lineStatement, functionValue)
	}

	var lower = getValueDefault(polylineDefinition.lower, -360.0)
	var upper = getValueDefault(polylineDefinition.upper, 360.0)
	var nextTitleTop = polylineControl.titleTop + HorizontalSliderWide.defaultHeightNew()
	var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
	polylineControl.titleTop = nextTitleTop
	var parameterControl = new HorizontalSliderWide(boundingBox, lower, polylineDefinition.text, upper, parameter)
	parameterControl.closestValueIndex = closestValueIndex
	parameterControl.controlChanged = modifyFloat
	parameterControl.decimalPlaces = polylineDefinition.decimalPlaces
	parameterControl.defaultValue = polylineDefinition.value
	parameterControl.functionValues = functionValues
	parameterControl.oldFunctionValues = parameterControl.functionValues.slice(0)
	parameterControl.oldParameter = parameter
	parameterControl.oldValues = values
	parameterControl.parameterIndex = parameterIndex
	parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
	completeParameterControl(parameterControl, view)
}

function completeParameterControl(parameterControl, view) {
	var polylineControl = view.polylineControl
	parameterControl.clipBox = polylineControl.controlsClipBox
	parameterControl.generatorName = 'Polyline'
	parameterControl.oldBoundingBox = parameterControl.boundingBox
	polylineControl.controls.push(parameterControl)
	view.controls.push(parameterControl)
}

function convertPointToScreen(point, control, view) {
	add2D(point, view.centerOffset)
	subtract2D(point, control.halfSize)
	multiply2DScalar(point, getExponentialZoom())
	add2D(point, control.halfSize)
	point[0] += control.boundingBox[0][0]
	point[1] = control.boundingBox[1][1] - point[1]

	return point
}

function convertPointsToScreen(points, control, view) {
	for (var point of points) {
		convertPointToScreen(point, control, view)
	}

	return points
}

class DimensionPoints extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		if (getIsEmpty(view.points)) {
			return
		}

		var boundingBox = getBoundingBox(view.points)
		var size = getSubtraction2D(boundingBox[1], boundingBox[0])
		var titleTop = view.analysisBoundingBox[0][1] + viewBroker.textSpace
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
	name = 'Dimension'
}

function drawClosestPolyline(control, view) {
	if (view.closestPointIndex == undefined) {
		return
	}

	var context = viewBroker.context
	context.lineWidth = 1.5
	if (view.colorControl.getState()) {
		context.strokeStyle = getValueDefault(gActionColorMap.get(getSelectedName(view.editControl)), 'black')
	}
	else {
		context.strokeStyle = 'black'
	}

	var marker = undefined
	var points = view.points
	var closestValueIndex = view.valueIndexes[view.closestPointIndex]
	var center = points[view.closestPointIndex]
	if (view.valueIsArrays[closestValueIndex] && view.isMarkerPoint) {
		var startIndex = 0
		for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
			var beforeValueIndex = view.valueIndexes[(vertexIndex + points.length - 1) % points.length]
			if (beforeValueIndex != closestValueIndex && view.valueIndexes[vertexIndex] == closestValueIndex) {
				startIndex = vertexIndex
				break
			}
		}
		var polyline = []
		for (var extraIndex = 0; extraIndex < points.length; extraIndex++) {
			vertexIndex = startIndex + extraIndex
			if (view.valueIndexes[vertexIndex] == closestValueIndex) {
				polyline.push(points[vertexIndex])
			}
			else {
				break
			}
		}
		var outlines = getOutlinesCheckIntersection(undefined, undefined, false, [[4, 4]], [polyline])
		marker = getLargestPolygon(outlines.filter(getIsCounterclockwise))
		convertPointsToScreen(marker, control, view)
	}
	else {
		var begin = points[(view.closestPointIndex + points.length - 1) % points.length]
		var end = points[(view.closestPointIndex + 1) % points.length]
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
		add2Ds(marker, getScreenByPoint(center, control, view))
	}

	drawLines(context, marker)
}

function drawImageByControl(control, view) {
	if (view.filename == undefined) {
		return
	}

	if (view.image == undefined) {
		view.image = new Image()
		view.image.src = view.filename
	}

	if (view.image.complete) {
		if (view.lowerPoint == undefined) {
			var size = getSubtraction2D(control.boundingBox[1], control.boundingBox[0])
			var zoomRatio = 1.0 * size[1] / Math.max(view.image.naturalHeight, view.image.naturalWidth)
			view.height = zoomRatio * view.image.naturalHeight
			view.width = zoomRatio * view.image.naturalWidth
			multiply2DScalar(size, 0.5)
			view.lowerPoint = [size[0] - view.width * 0.5, view.height * 1.5 - size[1]]
		}
		var lowerScreen = getScreenByPoint(view.lowerPoint, control, view)
		var zoom = getExponentialZoom()
		viewBroker.context.drawImage(view.image, lowerScreen[0], lowerScreen[1], view.width * zoom, view.height * zoom)
	}
	else {
		view.image.onload = wordscapeViewDraw
	}
}

function drawModifyControls(control, view) {
	drawControls(view.modifyControls, view)
}

function drawPointsWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.view)
}

function drawPointsGrid(control, context, view) {
	var boundingBox = control.boundingBox
	var gridSpacing = getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier)
	var lowerOver = divide2DScalar(getPointByScreen(boundingBox[0], control, view), gridSpacing)
	var upperOver = divide2DScalar(getPointByScreen(boundingBox[1], control, view), gridSpacing)
	var halfGridSpacing = 0.5 * gridSpacing
	var floorX = gridSpacing * Math.floor(lowerOver[0])
	var ceilX = gridSpacing * Math.ceil(upperOver[0])
	var floorY = gridSpacing * Math.floor(upperOver[1])
	var ceilY = gridSpacing * Math.ceil(lowerOver[1])
	context.lineWidth = 0.7
	if (view.colorControl.getState()) {
		context.lineWidth = 1.7
		context.strokeStyle = '#7070e0'
	}
	else {
		context.strokeStyle = 'black'
	}

	for (var x = floorX; x < ceilX + halfGridSpacing; x += gridSpacing) {
		drawLine(context, convertPointToScreen([x, floorY], control, view), convertPointToScreen([x, ceilY], control, view))
	}

	for (var y = floorY; y < ceilY + halfGridSpacing; y += gridSpacing) {
		drawLine(context, convertPointToScreen([floorX, y], control, view), convertPointToScreen([ceilX, y], control, view))
	}
}

function drawPointsUpdateGrid() {
	drawPointsWithoutArguments()
	viewBroker.view.gridAnalysisControl.draw(viewBroker.view)
	viewBroker.view.gridControl.draw(viewBroker.view)
}

function getCommaSeparatedAddition(addition, decimalPlaces, valueStrings, view) {
	for (var parameterIndex = 0; parameterIndex < 2; parameterIndex++) {
		var additionFloat = addition[parameterIndex]
		var value = valueStrings[parameterIndex]
		var lastIndexOfPlus = value.lastIndexOf('+')
		if (lastIndexOfPlus == -1) {
			if (isNaN(value)) {
				valueStrings[parameterIndex] = value + '+' + additionFloat.toFixed(decimalPlaces)
			}
			else {
				valueStrings[parameterIndex] = (parseFloat(value) + additionFloat).toFixed(decimalPlaces)
			}
		}
		else {
			var afterPlus = value.slice(lastIndexOfPlus + 1)
			if (!isNaN(afterPlus)) {
				additionFloat += parseFloat(afterPlus)
				value = value.slice(0, lastIndexOfPlus)
			}
			valueStrings[parameterIndex] = value + '+' + additionFloat.toFixed(decimalPlaces)
		}
	}

	return valueStrings.join(',')
}

function getDefinedValueStrings(valueStrings, view) {
	var secondCommaIndex = getIndexOfBracketed(valueStrings[1], ',')
	if (secondCommaIndex != -1) {
		valueStrings.push(valueStrings[1].slice(secondCommaIndex + 1).trim())
		valueStrings[1] = valueStrings[1].slice(0, secondCommaIndex).trim()
	}

	if (view.closestPointIndex == 0) {
		return valueStrings
	}

	var oldPoint = view.points[view.closestPointIndex - 1]
	for (var parameterIndex = 0; parameterIndex < 2; parameterIndex++) {
		if (valueStrings[parameterIndex] == '') {
			valueStrings[parameterIndex] = oldPoint[parameterIndex].toString()
		}
	}

	return valueStrings
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

function getFunctionSliceIndexesByName(text, name) {
	if (text == undefined) {
		return undefined
	}

	var indexOfName = text.indexOf(name)
	if (indexOfName == -1) {
		return undefined
	}

	var indexOfNameEnd = indexOfName + name.length
	var secondWord = text.slice(indexOfNameEnd)
	if (!secondWord.trim().startsWith('(')) {
		return undefined
	}

	var indexOfEnd = getIndexOfBracketed(secondWord, ')')
	if (indexOfEnd == -1) {
		return undefined
	}

	return [indexOfNameEnd + secondWord.indexOf('(') + 1, indexOfNameEnd + indexOfEnd]
}

function getFunctionValuesByName(text, name) {
	var sliceIndexes = getFunctionSliceIndexesByName(text, name)
	if (sliceIndexes == undefined) {
		return undefined
	}

	return getSplitsAroundBracketed(text.slice(sliceIndexes[0], sliceIndexes[1]), ',')
}

function getIsFloatControlCloseToDefault(control) {
	if (control.defaultValue == undefined) {
		return false
	}

	return Math.abs(control.value - control.defaultValue) < control.halfStepClose
}

function getIsPointControlCloseToDefault(control) {
	for (var slider of control.sliders) {
		if (!getIsFloatControlCloseToDefault(slider)) {
			return false
		}
	}

	return true
}

function getMovePointString(addition, closestValueIndex, values, view) {
	var valueString = values[closestValueIndex]
	var arrayCommaIndex = -1
	if (valueString.startsWith('Vector.getAddition2D')) {
		arrayCommaIndex = getIndexOfBracketed(valueString, ',', 1)
	}

	if (arrayCommaIndex == -1) {
		if (view.valueIsArrays[closestValueIndex]) {
			valueString = 'Vector.getAddition2Ds(' + valueString
		}
		else {
			var pointCommaIndex = getIndexOfBracketed(valueString, ',')
			if (pointCommaIndex != -1) {
				var valueStrings = [valueString.slice(0, pointCommaIndex).trim(), valueString.slice(pointCommaIndex + 1).trim()]
				return getCommaSeparatedAddition(addition, 1, getDefinedValueStrings(valueStrings, view))
			}
			valueString = 'Vector.getAddition2D([' + valueString + ']'
		}
		return valueString + ', [' + getFixedStrings(addition).join(',') + '])'
	}

	var afterComma = valueString.slice(arrayCommaIndex + 1, -1).trim()
	if (afterComma.startsWith('[')) {
		afterComma = afterComma.slice(1, -1)
	}

	add2D(addition, getFloatsUpdateByStatementValue(viewBroker.registry, view.lineStatement, afterComma)[0])
	return valueString.slice(0, arrayCommaIndex) + ', [' + getFixedStrings(addition).join(',') + '])'
}

function getParameterFloatString(control, valueString) {
	if (getIsEmpty(valueString)) {
		if (getIsFloatControlCloseToDefault(control)) {
			return undefined
		}
		return control.value.toFixed(control.decimalPlaces)
	}

	var change = control.value - control.oldParameter
	if (!isNaN(valueString)) {
		if (getIsFloatControlCloseToDefault(control)) {
			return undefined
		}
		return (parseFloat(valueString) + change).toFixed(control.decimalPlaces)
	}

	var lastIndexOfPlus = valueString.lastIndexOf('+')
	if (lastIndexOfPlus != -1) {
		var afterPlus = valueString.slice(lastIndexOfPlus + 1)
		if (!isNaN(afterPlus)) {
			change += parseFloat(afterPlus)
			valueString = valueString.slice(0, lastIndexOfPlus)
		}
	}

	return valueString + '+' + change.toFixed(control.decimalPlaces)
}

function getParameterPointString(control, valueString) {
	var sliders = control.sliders
	var controlPoint = new Array(sliders.length)
	for (var sliderIndex = 0; sliderIndex < sliders.length; sliderIndex++) {
		controlPoint[sliderIndex] = sliders[sliderIndex].value
	}

	if (getIsEmpty(valueString)) {
		if (getIsPointControlCloseToDefault(control)) {
			return undefined
		}
		return '[' + getFixedStrings(controlPoint, control.decimalPlaces) + ']'
	}

	var addition = getSubtraction2D(controlPoint, control.oldParameter)
	var arrayCommaIndex = -1
	if (valueString.startsWith('Vector.getAddition2D')) {
		arrayCommaIndex = getIndexOfBracketed(valueString, ',', 1)
	}

	var parameterString = undefined
	if (arrayCommaIndex == -1) {
		var trimmedString = valueString.trim().slice(1, -1)
		var pointCommaIndex = getIndexOfBracketed(trimmedString, ',')
		if (pointCommaIndex != -1) {
			var valueStrings = [trimmedString.slice(0, pointCommaIndex).trim(), trimmedString.slice(pointCommaIndex + 1).trim()]
			var commaSeparatedAddition = getCommaSeparatedAddition(addition, 1, valueStrings)
			if (commaSeparatedAddition.indexOf('+') == -1 && getIsPointControlCloseToDefault(control)) {
				return undefined
			}
			return '[' + commaSeparatedAddition + ']'
		}
		parameterString = 'Vector.getAddition2D(' + valueString
	}
	else {
		var afterComma = valueString.slice(arrayCommaIndex + 1, -1).trim()
		if (afterComma.startsWith('[')) {
			afterComma = afterComma.slice(1, -1)
		}
		add2D(addition, getFloatsUpdateByStatementValue(viewBroker.registry, view.lineStatement, afterComma)[0])
		parameterString = valueString.slice(0, arrayCommaIndex)
	}

	return parameterString + ', [' + getFixedStrings(addition, control.decimalPlaces).join(',') + '])'
}

function getPointByEvent(control, event, view) {
	return getPointByScreen([event.offsetX, event.offsetY], control, view)
}

function getPointByScreen(screenPoint, control, view) {
	var point = [screenPoint[0] - control.boundingBox[0][0], control.boundingBox[1][1] - screenPoint[1]]
	subtract2D(point, control.halfSize)
	divide2DScalar(point, getExponentialZoom())
	add2D(point, control.halfSize)
	return subtract2D(point, view.centerOffset)
}

function getScreenByPoint(point, control, view) {
	return convertPointToScreen(point.slice(0, 2), control, view)
}

function getValuesSetVariableMap(statement, value) {
	var values = getValues(value)
	var variableMap = getVariableMapByStatement(statement)
	variableMap.set('_values', values)
	return values
}

class GridAnalysisPoints extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		setTextContext(context)
		var text = 'Grid Spacing: ' + getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier)
		context.fillText(text, viewBroker.analysisCharacterBegin, view.gridAnalysisBottom)
	}
	name = 'Grid'
}

class InspectPoints extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var boundingBox = view.analysisBoundingBox
		var context = viewBroker.context
		clearBoundingBox(boundingBox, context)
		if (this.mousePoint == undefined) {
			return
		}

		setTextContext(context)
		var boundingBoxTopPlus = boundingBox[0][1] + viewBroker.textSpace
		var y = boundingBoxTopPlus + viewBroker.textSpace
		drawArrays(context, 'X: Y:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
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

function modifyBoolean(control, view) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	control.functionValues[control.parameterIndex] = getValueStringIfDifferent(control.selectedState, control.defaultState)
	removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsValueIndexes(values.join(' '))
	updateClosestPointIndex()
	outputPointsDrawPoints(view)
}

function modifyFloat(control, view) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	var functionValue = control.oldFunctionValues[control.parameterIndex]
	control.functionValues[control.parameterIndex] = getParameterFloatString(control, functionValue)
	removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsValueIndexes(values.join(' '))
	updateClosestPointIndex()
	outputPointsDrawPoints(view)
}

function modifyPoint(control, view) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	var functionValue = control.oldFunctionValues[control.parameterIndex]
	control.functionValues[control.parameterIndex] = getParameterPointString(control, functionValue)
	removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsValueIndexes(values.join(' '))
	updateClosestPointIndex()
	outputPointsDrawPoints(view)
}

class Mouse extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var boundingBox = view.analysisBoundingBox
		clearBoundingBox(boundingBox, context)
		if (this.screenPoint == undefined) {
			return
		}

		var y = boundingBox[0][1] + viewBroker.textSpace
		setTextContext(context)
		drawArrays(context, 'X: Y:'.split(' '), viewBroker.textSpace, viewBroker.analysisCharacterBegin, y)
		drawNumericArrays(context, this.screenPoint, viewBroker.textSpace, viewBroker.analysisSizeBegin, y)
	}
	name = 'Mouse'
}

function mouseDownPointsInspect(control, event, view) {
	if (view.points.length == 0) {
		return
	}

	var inspectControl = view.inspectControl
	if (view.analysisControl.selectedIndex < 4) {
		view.analysisControl.selectedIndex = 2
	}

	view.analysisControl.draw(view)
	inspectControl.closestPointIndex = getClosestPointIndex(getPointByEvent(control, event, view), view.points)
	inspectControl.mousePoint = view.points[inspectControl.closestPointIndex]
	inspectControl.change = undefined
	if (inspectControl.last != undefined) {
		inspectControl.change = getSubtraction2D(inspectControl.mousePoint, inspectControl.last)
		inspectControl.change.push(length2D(inspectControl.change))
		inspectControl.lastDisplay = inspectControl.last
		if (inspectControl.change[2] < gClose) {
			inspectControl.change = undefined
		}
	}

	inspectControl.draw(view)
	view.polylineControl.draw(view)
	inspectControl.last = inspectControl.mousePoint
}

function mouseDownReverse(control, event, view) {
	view.points.reverse()
	outputPointsDrawPoints(view)
}

var moveManipulator = {
	mouseMove: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			return
		}

		var view = viewBroker.view
		view.centerOffset = getAddition2D(divide2DScalar(mouseMovementFlipped, getExponentialZoom()), viewBroker.mouseDownCenterOffset)
		drawPointsWithoutArguments()
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

		var view = viewBroker.view
		view.centerOffset = getAddition2D(divide2DScalar(mouseMovementFlipped, getExponentialZoom()), viewBroker.mouseDownCenterOffset)
		pointsMouseOut(view)
	}
}

function movePointByEvent(event, manipulator, mouseMovementFlipped, view) {
	if (!isPointInsideBoundingBox(view.viewControl.boundingBox, [event.offsetX, event.offsetY])) {
		return
	}

	var closestValueIndex = view.valueIndexes[view.closestPointIndex]
	var values = manipulator.oldValues.slice(0)
	var addition = divide2DScalar(mouseMovementFlipped, getExponentialZoom())
	values[closestValueIndex] = getMovePointString(addition, closestValueIndex, values, view)
	setPointsValueIndexes(values.join(' '))
}

var movePointManipulator = {
	mouseMove: function(event) {
		var mouseMovementFlipped = getMouseMovementFlipped(event)
		if (mouseMovementFlipped == undefined) {
			return
		}

		var view = viewBroker.view
		movePointByEvent(event, this, mouseMovementFlipped, view)
		pointsMouseMove(event, view)
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

		var view = viewBroker.view
		movePointByEvent(event, this, mouseMovementFlipped, view)
		pointsMouseUp(view)
		view.polylineControl.draw(view)
	}
}

function outputPointsDrawPoints(view) {
	var fittedString = ''
	if (view.points.length > 0) {
		var boundingBox = getBoundingBox(view.points)
		var minimumPoint = boundingBox[0]
		var size = getSubtraction2D(boundingBox[1], minimumPoint)
		var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
		var multiplier = 100.0 / maximumDimension
		for (var fittedIndex = 0; fittedIndex < view.points.length; fittedIndex++) {
			var point = view.points[fittedIndex]
			var x = multiplier * (point[0] - minimumPoint[0])
			var y = multiplier * (point[1] - minimumPoint[1])
			fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
		}
	}

//	console.log(fittedString)
	view.dimensionControl.draw(view)
	drawPointsWithoutArguments()
}

function pointsMouseMove(event, view) {
	drawPointsWithoutArguments()
}

function pointsMouseOut(view) {
	drawPointsWithoutArguments()
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function pointsMouseUp(view) {
	outputPointsDrawPoints(view)
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

class Polyline extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		removeByGeneratorName(view.controls, 'Polyline')

		var closestValueIndex = view.valueIndexes[view.inspectControl.closestPointIndex]
		if (getIsEmpty(view.points) || view.inspectControl.closestPointIndex == undefined) {
			return
		}

		if (!view.valueIsArrays[closestValueIndex]) {
			return
		}

		createPolylineDefinitionsMap()
		var values = getValues(view.pointString)
		for (var polylineDefinitionsKey of gPolylineDefinitionsMap.keys()) {
			var functionValues = getFunctionValuesByName(values[closestValueIndex], polylineDefinitionsKey)
			if (functionValues != undefined) {
				this.titleTop = view.analysisBoundingBox[0][1] + viewBroker.textSpace
				setTextContext(context)
				context.fillText(polylineDefinitionsKey, viewBroker.analysisCharacterBegin, this.titleTop)
				this.titleTop += viewBroker.halfTextSpace
				var controlsTop = this.titleTop
				var height = viewBroker.canvas.height
				var width = viewBroker.canvas.width
				this.controlsClipBox = [[height, controlsTop], [width, height]]
				this.controls = []
				var definitionsLength = gPolylineDefinitionsMap.get(polylineDefinitionsKey).length
				for (var parameterIndex = 0; parameterIndex < definitionsLength; parameterIndex++) {
					addParameterControl(closestValueIndex, functionValues, parameterIndex, polylineDefinitionsKey, values, view)
				}
				if (this.titleTop > height) {
					var controlRight = width - viewBroker.controlWidth
					this.controlsClipBox[1][0] = controlRight
					for (var control of this.controls) {
						var boundingBox = getArraysCopy(control.boundingBox)
						boundingBox[1][0] = controlRight
						control.oldBoundingBox = boundingBox
						control.resize(boundingBox)
					}
					var scrollBoundingBox = [[controlRight, controlsTop], [width, height]]
					var heightMinusTop = height - this.titleTop
					var span = height
					this.scrollControl = new VerticalScrollBar(scrollBoundingBox, heightMinusTop, span, 0.0, 0.0)
					this.scrollControl.controlChanged = scrollPolylineControls
					this.scrollControl.generatorName = 'Polyline'
					view.controls.push(this.scrollControl)
				}
				drawByGeneratorName(view.controls, 'Polyline', view)
				return
			}
		}
	}
	name = 'Polyline'
}

function scrollPolylineControls() {
	var context = viewBroker.context
	var view = viewBroker.view
	var down = view.polylineControl.scrollControl.value
	clearBoundingBox(view.polylineControl.controlsClipBox, context)
	for (var control of view.polylineControl.controls) {
		var boundingBox = getArraysCopy(control.oldBoundingBox)
		boundingBox[0][1] += down
		boundingBox[1][1] += down
		control.resize(boundingBox)
	}

	drawControls(view.polylineControl.controls, view)
}

function setPointsValueIndexes(pointString) {
	document.getElementById('pointsInputID').value = pointString
	viewBroker.view.pointString = pointString
	setValueIndexes(pointString)
}

function setValueIndexes(pointString) {
	var view = viewBroker.view
	var lineStatement = view.lineStatement
	var registry = viewBroker.registry
	view.valueIndexes = []
	view.valueIsArrays = []
	view.points = getFloatListsByStatementValue(registry, lineStatement, pointString, view.valueIndexes, view.valueIsArrays)
	var attributeMap = lineStatement.attributeMap
	var tag = lineStatement.tag
	var alterationString = attributeMap.get('alteration')
	var alterations = alterationString.replace(/,/g, ' ').split(' ').filter(lengthCheck)
	var indexOfView = alterations.indexOf('view')
	alterations.splice(indexOfView, 1)
	var lineStatementCopy = getStatementByParentTag(new Map(attributeMap), lineStatement.nestingIncrement, lineStatement.parent, tag)
	lineStatementCopy.variableMap = lineStatement.variableMap
	lineStatementCopy.attributeMap.set('alteration', alterations.join(' '))
	lineStatementCopy.attributeMap.set('points', pointString)
	gTagCenterMap.get(tag).processStatement(registry, lineStatementCopy)
	view.tag = lineStatementCopy.tag
	view.tagPoints = getPointsHD(registry, lineStatementCopy)
}

class Tag extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(view) {
		var context = viewBroker.context
		clearBoundingBox(view.analysisBoundingBox, context)
		if (getIsEmpty(view.points)) {
			return
		}

		var titleTop = view.analysisBoundingBox[0][1] + viewBroker.textSpace
		var y = titleTop + viewBroker.textSpace
		setTextContext(context)
		context.fillText(view.lineStatement.tag, viewBroker.analysisSizeBegin, titleTop)
	}
	name = 'Tag'
}

function updateClosestPointIndex() {
	var view = viewBroker.view
	var point = getPointByScreen(view.mouseControl.screenPoint, view.viewControl, view)
	if (point == undefined) {
		return
	}

	var addPointIndex = undefined
	var addValueIndex = undefined
	var closestPointIndex = undefined
	var isMarkerPoint = undefined
	if (view.points.length > 0) {
		var name = getSelectedName(view.editControl)
		closestPointIndex = getClosestPointIndex(point, view.points)
		if (name == 'Move Point' || name == 'Delete') {
			isMarkerPoint = true
		}
		else {
			if (name == 'Add') {
				if (isPointInsideBoundingBox(view.viewControl.boundingBox, view.mouseControl.screenPoint)) {
					var closestValueIndex = view.valueIndexes[closestPointIndex]
					var valuesLength = view.valueIndexes[view.valueIndexes.length - 1] + 1
					var beginValueIndex = (closestValueIndex - 1 + valuesLength) % valuesLength
					var endValueIndex = (closestValueIndex + 1) % valuesLength
					var beginIndex = 0
					for (; beginIndex < view.points.length; beginIndex++) {
						addPointIndex = (beginIndex + 1) % view.points.length
						if (view.valueIndexes[beginIndex] == beginValueIndex && view.valueIndexes[addPointIndex] == closestValueIndex) {
							break
						}
					}
					var endIndex = 0
					var previousIndex = 0
					for (; endIndex < view.points.length; endIndex++) {
						previousIndex = (endIndex - 1 + view.points.length) % view.points.length
						if (view.valueIndexes[endIndex] == endValueIndex && view.valueIndexes[previousIndex] == closestValueIndex) {
							break
						}
					}
					addValueIndex = closestValueIndex
					var distanceBegin = getDistanceToLineSegment(view.points[beginIndex], view.points[addPointIndex], point)
					var distanceEnd = getDistanceToLineSegment(view.points[previousIndex], view.points[endIndex], point)
					if (distanceBegin > distanceEnd) {
						addPointIndex = endIndex
						addValueIndex = endValueIndex
					}
				}
			}
			if (name != 'Inspect') {
				closestPointIndex = undefined
			}
		}
		
		if (name == 'Move Point' || name == 'Delete' || name == 'Inspect') {
			if (name != 'Inspect') {
				isMarkerPoint = true
			}
		}
	}

	if (view.closestPointIndex != closestPointIndex || view.isMarkerPoint != isMarkerPoint || view.mouseMovePoint != point) {
		view.addPointIndex = addPointIndex
		view.addValueIndex = addValueIndex
		view.mouseMovePoint = point
		view.closestPointIndex = closestPointIndex
		view.isMarkerPoint = isMarkerPoint
		drawPointsWithoutArguments()
	}
}

function updateStatement() {
	var view = viewBroker.view
	var lineStatement = view.lineStatement
	var lineIndex = lineStatement.lineIndex
	var lines = viewBroker.registry.lines
	view.pointString = document.getElementById('pointsInputID').value
	var viewString = view.pointString
	var linePointsValue = lineStatement.attributeMap.get('points')
	console.log(linePointsValue)
	if (linePointsValue == undefined) {
		var line = lines[lineIndex].trim()
		var indexOfSpace = line.indexOf(' ')
		if (indexOfSpace != -1 && !getIsEmpty(viewString)) {
			lines[lineIndex] = line.slice(0, indexOfSpace) + ' points=' + viewString + line.slice(indexOfSpace)
		}
	}
	else {
		lines[lineIndex] = getLineByKeySearchReplace(lines[lineIndex], 'points', linePointsValue, viewString)
	}

	lineStatement.attributeMap.set('points', viewString)
	document.getElementById('wordAreaID').value = lines.join(getEndOfLine(document.getElementById('wordAreaID').value))
	setValueIndexes(viewString)
	outputPointsDrawPoints(view)
	view.polylineControl.draw(view)
}

class ViewControl extends CanvasControl {
	constructor(boundingBox, halfSize) {
		super()
		this.boundingBox = boundingBox
		this.clipBox = boundingBox
		this.halfSize = halfSize
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var boundingBox = this.boundingBox
		clearBoundingBox(boundingBox, context)
		drawImageByControl(this, view)
		if (view.gridControl.getState()) {
			drawPointsGrid(this, context, view)
		}

		var lineWidth = 1.5 + 1.0 * view.colorControl.getState()
		context.lineWidth = lineWidth
		context.strokeStyle = 'black'
		var points = view.points
		if (points.length > 0) {	
			if (view.addPointIndex != undefined) {
				points = getArraysCopy(points)
				points.splice(view.addPointIndex, 0, view.mouseMovePoint.slice(0))
			}
			if (view.colorControl.getState()) {
				context.strokeStyle = 'yellow'
			}
			var polylineLength = view.tagPoints.length - 1 * (view.tag != 'polygon')
			drawLines(context, convertPointsToScreen(getArraysCopy(view.tagPoints), this, view), polylineLength)
			if (view.colorControl.getState()) {
				context.strokeStyle = 'blue'
				if (view.isPolygon) {
					context.strokeStyle = 'lime'
				}
			}
			var polylineLength = points.length - 1 * (!view.isPolygon)
			drawLines(context, convertPointsToScreen(getArraysCopy(points), this, view), polylineLength)
			if (view.closestPointIndex != undefined) {
				drawClosestPolyline(this, view)
				context.lineWidth = lineWidth
			}
		}
	}
	mouseDownPrivate(event, view) {
		var name = getSelectedName(view.editControl)
		var point = getPointByEvent(this, event, view)
		if (name == 'Add') {
			var values = getValues(view.pointString)
			values.splice(view.addValueIndex, 0, view.mouseMovePoint.toString())
			setPointsValueIndexes(values.join(' '))
			outputPointsDrawPoints(view)
			return
		}

		if (name == 'Delete') {
			var closestPointIndex = getClosestPointIndex(point, view.points)
			if (closestPointIndex == undefined) {
				return
			}
			var values = getValues(view.pointString)
			values.splice(view.valueIndexes[closestPointIndex], 1)
			setPointsValueIndexes(values.join(' '))
			updateClosestPointIndex()
			outputPointsDrawPoints(view)
			return
		}

		if (name == 'Move Point') {
			if (viewBroker.view.points.length > 0) {
				viewBroker.mouseMoveManipulator = movePointManipulator
				movePointManipulator.oldPoints = getArraysCopy(view.points)
				movePointManipulator.oldValues = getValues(view.pointString)
				view.closestPointIndex = getClosestPointIndex(point, view.points)
			}
			return
		}

		if (name == 'Inspect') {
			mouseDownPointsInspect(this, event, view)
			return
		}

		viewBroker.mouseDownCenterOffset = view.centerOffset
		viewBroker.mouseMoveManipulator = moveManipulator
	}
}

function ViewPoints() {
	this.clearView = function() {
		document.getElementById('pointsID').hidden = true
		document.getElementById('pointsInputID').hidden = true
		document.getElementById('pointsUpdateStatementID').hidden = true
		document.getElementById('tagID').hidden = true
		document.getElementById('tagInputID').hidden = true
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
		this.mouseControl.screenPoint = [event.offsetX, event.offsetY]
		if (viewBroker.mouseMoveManipulator == undefined) {
			updateClosestPointIndex()
		}
		else {
			viewBroker.mouseMoveManipulator.mouseMove(event)
		}

		this.mouseControl.draw(this)
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
		var valueMap = viewBroker.valueMap
		var width = viewBroker.canvas.width
		this.controls = controls
		var intervals = intervalsFromToQuantity(0.0, height, 5, false)
		intervals.forEach(Math.round)

		var bottomIntervals = intervalsFromToQuantity(0.0, height, 2, false)
		bottomIntervals.forEach(Math.round)
		var reverseButton = new Button([[0.0, viewBroker.heightMinus], [bottomIntervals[0], height]], 'Reverse')
		reverseButton.onClick = mouseDownReverse
		controls.push(reverseButton)
		var colorBoundingBox = [[bottomIntervals[0], viewBroker.heightMinus], [bottomIntervals[1], height]]
		this.colorControl = new Checkbox(colorBoundingBox, 'Color', getKeyMapDefault('pointsColor', valueMap, true))
		this.colorControl.controlChanged = drawPointsWithoutArguments
		controls.push(this.colorControl)

		var viewBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		var halfSize = multiply2DScalar(getSubtraction2D(viewBoundingBox[1], viewBoundingBox[0]), 0.5)
		this.viewControl = new ViewControl(viewBoundingBox, halfSize)
		controls.push(this.viewControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawPointsUpdateGrid
		controls.push(this.zoomControl)

		var texts = ['Add', 'Move Point', 'Delete', 'Inspect', 'Move View']
		this.editControl = new Choice([[0, 0], [intervals[4], controlWidth]], texts)
		this.editControl.controlChanged = updateClosestPointIndex
		this.editControl.selectedIndex = 3
		controls.push(this.editControl)

		var texts = ['Dimension', 'Grid', 'Inspect', 'Mouse', 'Polyline', 'Tag']
		this.analysisControl = new TableChoice([[height, 0], [width, controlWidth * 2]], texts, 2)
		this.analysisControl.controlChanged = drawAnalysisControls
		controls.push(this.analysisControl)
		var analysisBottom = controlWidth * 2
		this.analysisBoundingBox = [[height, analysisBottom], [width, height]]
		this.dimensionControl = new DimensionPoints()
		this.gridAnalysisControl = new GridAnalysisPoints()
		this.inspectControl = new InspectPoints()
		this.mouseControl = new Mouse()
		this.polylineControl = new Polyline()
		this.tagControl = new Tag()
		this.gridAnalysisBottom = analysisBottom + viewBroker.textSpace
		var gridControlTop = this.gridAnalysisBottom + viewBroker.halfTextSpace
		var gridBoundingBox = [[height, gridControlTop], [height + (width - height) / 3.0, gridControlTop + controlWidth]]
		this.gridControl = new Checkbox(gridBoundingBox, 'Grid', getKeyMapDefault('pointsGrid', valueMap, false))
		this.gridControl.controlChanged = drawPointsUpdateGrid
		this.gridControl.name = 'Grid'
		this.analysisControls = [this.dimensionControl, this.gridAnalysisControl, this.inspectControl, this.mouseControl]
		pushArray(this.analysisControls, [this.polylineControl, this.tagControl, this.gridControl])
		for (var analysisControl of this.analysisControls) {
			analysisControl.displayFunction = controlIsAnalysisName
		}
		pushArray(controls, this.analysisControls)
	}
	this.updateView = function(isViewHidden) {
		this.closestPointIndex = undefined
		setPointsValueIndexes(this.lineStatement.attributeMap.get('points'))
		document.getElementById('pointsID').hidden = false
		document.getElementById('pointsInputID').hidden = false
		var tagText = document.getElementById('tagID')
		tagText.textContent = this.lineStatement.tag
		tagText.hidden = false
		this.isPolygon = tagText.textContent == 'polygon'
		document.getElementById('tagInputID').hidden = false
		document.getElementById('pointsUpdateStatementID').hidden = false
	}
}
