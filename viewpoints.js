//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gActionColorMap = new Map([['Delete', 'red'], ['Inspect', 'green']])

function addPolylineControl(closestValueIndex, functionValues, parameterIndex, polylineDefinitionsKey, values, view) {
	var analysis = view.analysis
	var definitions = gPolylineDefinitionsMap.get(polylineDefinitionsKey)
	var polylineControl = view.analysis.polylineControl
	var definition = definitions[parameterIndex]
	if (definition == undefined) {
		return
	}

	var functionValue = functionValues[parameterIndex]
	if (definition.checked != undefined) {
		var parameter = definition.checked
		if (!arrayKit.getIsEmpty(functionValue)) {
			parameter = getBooleanByStatementValue(undefined, viewBroker.registry, analysis.statement, functionValue)
		}
		var nextTitleTop = polylineControl.titleTop + Checkbox.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		polylineControl.titleTop = nextTitleTop
		var parameterControl = new Checkbox(boundingBox, definition.text, parameter)
		parameterControl.closestValueIndex = closestValueIndex
		parameterControl.controlChanged = polylineBoolean
		parameterControl.defaultState = definition.checked
		parameterControl.functionValues = functionValues
		parameterControl.oldValues = values
		parameterControl.parameterIndex = parameterIndex
		parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
		completeParameterControl(parameterControl, polylineControl, view)
		return
	}

	if (definition.point != undefined) {
		var parameter = definition.point
		if (!arrayKit.getIsEmpty(functionValue)) {
			parameter = getPoint2DByStatementValue(undefined, viewBroker.registry, analysis.statement, functionValue)
		}
		var lower = Value.getValueDefault(definition.lower, -360.0)
		var upper = Value.getValueDefault(definition.upper, 360.0)
		var nextTitleTop = polylineControl.titleTop + HorizontalSliderPoint.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		polylineControl.titleTop = nextTitleTop
		var parameterControl = new HorizontalSliderPoint(boundingBox, lower, definition.text, upper, parameter)
		parameterControl.closestValueIndex = closestValueIndex
		parameterControl.controlChanged = polylinePoint
		parameterControl.decimalPlaces = definition.decimalPlaces
		var sliders = parameterControl.sliders
		for (var sliderIndex = 0; sliderIndex < Math.min(sliders.length, definition.point.length); sliderIndex++) {
			sliders[sliderIndex].valueDefault = definition.point[sliderIndex]
		}
		parameterControl.functionValues = functionValues
		parameterControl.oldFunctionValues = parameterControl.functionValues.slice(0)
		parameterControl.oldParameter = parameter
		parameterControl.oldValues = values
		parameterControl.parameterIndex = parameterIndex
		parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
		completeParameterControl(parameterControl, polylineControl, view)
		return
	}

	var parameter = definition.value
	if (!arrayKit.getIsEmpty(functionValue)) {
		parameter = getFloatByStatementValue(undefined, viewBroker.registry, analysis.statement, functionValue)
	}

	var lower = Value.getValueDefault(definition.lower, -360.0)
	var upper = Value.getValueDefault(definition.upper, 360.0)
	var nextTitleTop = polylineControl.titleTop + HorizontalSliderWide.defaultHeightNew()
	var boundingBox = [[viewBroker.canvas.height, polylineControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
	polylineControl.titleTop = nextTitleTop
	var parameterControl = new HorizontalSliderWide(boundingBox, lower, definition.text, upper, parameter)
	parameterControl.closestValueIndex = closestValueIndex
	parameterControl.controlChanged = polylineValue
	parameterControl.decimalPlaces = definition.decimalPlaces
	parameterControl.functionValues = functionValues
	parameterControl.oldFunctionValues = parameterControl.functionValues.slice(0)
	parameterControl.oldParameter = parameter
	parameterControl.oldValues = values
	parameterControl.parameterIndex = parameterIndex
	parameterControl.polylineDefinitionsKey = polylineDefinitionsKey
	parameterControl.valueDefault = definition.value
	completeParameterControl(parameterControl, polylineControl, view)
}

function addScrollBarDraw(context, control, controlsTop) {
	var height = viewBroker.canvas.height
	if (control.titleTop > height) {
		var width = viewBroker.canvas.width
		var controlRight = width - viewCanvas.controlWidth
		control.controlsClipBox[1][0] = controlRight
		for (var childControl of control.controls) {
			var boundingBox = arrayKit.getArraysCopy(childControl.boundingBox)
			boundingBox[1][0] = controlRight
			childControl.oldBoundingBox = boundingBox
			childControl.resize(boundingBox)
		}
		var scrollBoundingBox = [[controlRight, controlsTop], [width, height]]
		control.scrollControl = new VerticalScrollBar(scrollBoundingBox, height - control.titleTop, height, 0.0, 0.0)
		control.scrollControl.controlChanged = scrollControls
		control.scrollControl.displayFunction = controlIsAnalysisName
		control.scrollControl.generatorName = control.name
		control.scrollControl.name = control.name
		control.scrollControl.parent = control
		control.scrollControl.view = control.view
		control.view.controls.push(control.scrollControl)
	}

	setDisplayFunctionControls(control.controls, controlIsAnalysisName)
	setViewControls(control.controls, control.view)
	drawByGeneratorName(context, control.view.controls, control.name)
}

function addTagControl(definition, definitionMap, view) {
	var analysis = view.analysis
	var camelText = getCamelCase(definition.text)
	var definitionMapValue = definitionMap.get(camelText)
	var tagControl = analysis.tagControl
	var value = getAttributeValue(camelText, statement.parent)
	if (definition.checked != undefined) {
		var parameter = definition.checked
		if (definitionMapValue != undefined) {
			parameter = getBooleanByStatementValue(undefined, viewBroker.registry, analysis.statement, definitionMapValue)
		}
		var nextTitleTop = tagControl.titleTop + Checkbox.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, tagControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		tagControl.titleTop = nextTitleTop
		var parameterControl = new Checkbox(boundingBox, definition.text, parameter)
		parameterControl.controlChanged = tagBoolean
		if (value == undefined) {
			parameterControl.defaultState = definition.checked
		}
		completeParameterControl(parameterControl, tagControl, view)
		return
	}

	var key = getCamelCase(definition.text)
	var tagInput = document.getElementById('tagInputID')
	var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(tagInput.value)))
	if (definition.point != undefined) {
		var parameter = definition.point
		if (definitionMapValue != undefined) {
			parameter = getPoint2DByStatementValue(undefined, viewBroker.registry, analysis.statement, definitionMapValue)
		}
		var lower = Value.getValueDefault(definition.lower, -360.0)
		var upper = Value.getValueDefault(definition.upper, 360.0)
		var nextTitleTop = tagControl.titleTop + HorizontalSliderPoint.defaultHeightNew()
		var boundingBox = [[viewBroker.canvas.height, tagControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
		tagControl.titleTop = nextTitleTop
		var parameterControl = new HorizontalSliderPoint(boundingBox, lower, definition.text, upper, parameter)
		parameterControl.controlChanged = tagPoint
		parameterControl.decimalPlaces = definition.decimalPlaces
		parameterControl.oldParameter = parameter
		parameterControl.oldParameterString = tagMap.get(key)
		var sliders = parameterControl.sliders
		if (value == undefined) {
			for (var sliderIndex = 0; sliderIndex < Math.min(sliders.length, definition.point.length); sliderIndex++) {
				sliders[sliderIndex].valueDefault = definition.point[sliderIndex]
			}
		}
		completeParameterControl(parameterControl, tagControl, view)
		return
	}

	var parameter = definition.value
	if (definitionMapValue != undefined) {
		parameter = getFloatByStatementValue(undefined, viewBroker.registry, analysis.statement, definitionMapValue)
	}

	var lower = Value.getValueDefault(definition.lower, -360.0)
	var upper = Value.getValueDefault(definition.upper, 360.0)
	var nextTitleTop = tagControl.titleTop + HorizontalSliderWide.defaultHeightNew()
	var boundingBox = [[viewBroker.canvas.height, tagControl.titleTop], [viewBroker.canvas.width, nextTitleTop]]
	tagControl.titleTop = nextTitleTop
	var parameterControl = new HorizontalSliderWide(boundingBox, lower, definition.text, upper, parameter)
	parameterControl.controlChanged = tagValue
	parameterControl.decimalPlaces = definition.decimalPlaces
	parameterControl.oldParameter = parameter
	parameterControl.oldParameterString = tagMap.get(key)
	if (value == undefined) {
		parameterControl.valueDefault = definition.value
	}

	completeParameterControl(parameterControl, tagControl, view)
}

class AnalysisPoints {
	constructor(analysisPointsArray, id) {
		this.drawMarker = drawPointsMarker
		this.lineWidthMultiplier = 1.0
	}
	clearIndexes() {
		this.addPointIndex = undefined
		this.closestPointIndex = undefined
	}
	clearView() {
		document.getElementById('pointsID').hidden = true
		document.getElementById('pointsInputID').hidden = true
		document.getElementById('pointsUpdateStatementID').hidden = true
		document.getElementById('tagID').hidden = true
		document.getElementById('tagInputID').hidden = true
	}
	draw(context) {
		drawControls(context, this.controls, this)
	}
	drawShape(boundingBox, context, control) {
		var boundingBox = this.boundingBox
		var view = this.view
		drawImageByControl(this, context, control)
		var isColor = view.analysis.colorControl.getValue()
		var lineWidth = (1.5 + 1.0 * isColor) * this.lineWidthMultiplier
		context.strokeStyle = 'black'
		var points = this.points
		if (points.length > 0) {	
			if (this.addPointIndex != undefined) {
				points = arrayKit.getArraysCopy(points)
				points.splice(this.addPointIndex, 0, view.mouseMovePoint.slice(0))
			}
			if (this.tagPointArrays != undefined) {
				if (isColor) {
					context.strokeStyle = 'gold'
				}
				for (var tagPoints of this.tagPointArrays) {
					context.lineWidth = lineWidth * 0.8
					drawLines(context, convertPointsToScreen(arrayKit.getArraysCopy(tagPoints), control), tagPoints.length - 1)
				}
			}
			if (isColor) {
				context.strokeStyle = 'blue'
				if (this.isPolygon) {
					context.strokeStyle = 'lime'
				}
			}
			var polylineLength = points.length - 1 * (!this.isPolygon)
			context.lineWidth = lineWidth
			drawLines(context, convertPointsToScreen(arrayKit.getArraysCopy(points), control), polylineLength)
			this.drawMarker(context, control)
		}
	}
	mouseDown(context, event) {
		mouseDownControls(context, this.controls, event)
	}
	start() {
		var controls = []
		var controlWidth = viewCanvas.controlWidth
		this.controls = controls
		var height = viewBroker.canvas.height
		var valueMap = viewCanvas.valueMap
		var width = viewBroker.canvas.width
		var texts = ['Display', 'Inspect', 'Mouse', 'Polyline', 'Tag']
		var analysisTableBox = [[height, 0], [width, controlWidth * 2]]
		this.analysisControl = new TableChoice(analysisTableBox, texts, 2, mapKit.getKeyMapDefault('pointsAnalysis', valueMap, 1))
		this.analysisControl.controlChanged = drawAnalysisControls
		controls.push(this.analysisControl)
		var analysisBottom = controlWidth * 2
		this.analysisBoundingBox = [[height, analysisBottom], [width, height]]
		this.displayAnalysisControl = new DisplayAnalysisPoints()
		this.inspectControl = new InspectPoints()
		this.mouseControl = new Mouse()
		this.polylineControl = new PolylineControl()
		this.tagControl = new Tag()
		var displayTop = analysisBottom
		var nextDisplayTop = displayTop + controlWidth
		var displayBoxRight = height + (width - height) / 3.0
		var colorBoundingBox = [[height, displayTop], [displayBoxRight, nextDisplayTop]]
		this.colorControl = new Checkbox(colorBoundingBox, 'Color', mapKit.getKeyMapDefault('pointsColor', valueMap, true))
		this.colorControl.controlChanged = drawPointsWithoutArguments
		this.colorControl.name = 'Display'
		this.gridAnalysisBottom = nextDisplayTop + viewCanvas.textSpace
		displayTop = this.gridAnalysisBottom + viewCanvas.halfTextSpace
		var gridBoundingBox = [[height, displayTop], [displayBoxRight, displayTop + controlWidth]]
		this.gridControl = new Checkbox(gridBoundingBox, 'Grid', mapKit.getKeyMapDefault('pointsGrid', valueMap, false))
		this.gridControl.controlChanged = drawPointsUpdateGrid
		this.gridControl.name = 'Display'
		this.displayAnalysisControl.controls = [this.gridControl, this.colorControl]
		this.shapeControls = [this.inspectControl, this.polylineControl, this.tagControl]
		this.analysisControls = this.shapeControls.slice(0)
		arrayKit.pushArray(this.analysisControls, [this.displayAnalysisControl, this.mouseControl])
		arrayKit.pushArray(this.analysisControls, this.displayAnalysisControl.controls)
		setDisplayFunctionControls(this.analysisControls, controlIsAnalysisName)
		arrayKit.pushArray(controls, this.analysisControls)
		setViewControls(controls, this.view)
	}
	updateView(isViewHidden) {
		this.closestPointIndex = undefined
		if (this.statement == undefined) {
			return
		}

		setTagInput(this.statement)
		setPointsInput(this, this.statement.attributeMap.get('points'))
		document.getElementById('pointsID').hidden = false
		document.getElementById('pointsInputID').hidden = false
		var tagText = document.getElementById('tagID')
		tagText.textContent = this.statement.tag
		tagText.hidden = false
		this.isPolygon = tagText.textContent == 'polygon'
		document.getElementById('tagInputID').hidden = false
		document.getElementById('pointsUpdateStatementID').hidden = false
	}
}

function completeParameterControl(parameterControl, parentControl, view) {
	parameterControl.clipBox = parentControl.controlsClipBox
	parameterControl.generatorName = parentControl.name
	parameterControl.name = parentControl.name
	parameterControl.oldBoundingBox = parameterControl.boundingBox
	parentControl.controls.push(parameterControl)
	view.controls.push(parameterControl)
}

function convertPointToScreen(point, control) {
	Vector.add2D(point, control.centerOffset)
	Vector.subtract2D(point, control.halfSize)
	Vector.multiply2DScalar(point, getExponentialZoom())
	Vector.add2D(point, control.halfSize)
	point[0] += control.boundingBox[0][0]
	if (control.scale < 0.0) {
		point[1] = control.boundingBox[1][1] - point[1]
	}
	else {
		point[1] += control.boundingBox[0][1]
	}

	return point
}

function convertPointsToScreen(points, control) {
	for (var point of points) {
		convertPointToScreen(point, control)
	}

	return points
}

class DisplayAnalysisPoints extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(context) {
		clearBoundingBox(this.view.analysis.analysisBoundingBox, context)
		setTextContext(context)
		var text = 'Grid Spacing: ' + getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier)
		context.fillText(text, viewBroker.analysisCharacterBegin, this.view.analysis.gridAnalysisBottom)
	}
	name = 'Display'
}

function drawImageByControl(analysis, context, control) {
	if (analysis.filename == undefined) {
		return
	}

	if (analysis.image == undefined) {
		analysis.image = new Image()
		analysis.image.src = analysis.filename
	}

	if (analysis.image.complete) {
		if (analysis.lowerPoint == undefined) {
			var size = Vector.getSubtraction2D(control.boundingBox[1], control.boundingBox[0])
			var zoomRatio = 1.0 * size[1] / Math.max(analysis.image.naturalHeight, analysis.image.naturalWidth)
			analysis.height = zoomRatio * analysis.image.naturalHeight
			analysis.width = zoomRatio * analysis.image.naturalWidth
			Vector.multiply2DScalar(size, 0.5)
			analysis.lowerPoint = [size[0] - analysis.width * 0.5, analysis.height * 1.5 - size[1]]
		}
		var lowerScreen = getScreenByPoint(analysis.lowerPoint, control)
		var zoom = getExponentialZoom()
		context.drawImage(analysis.image, lowerScreen[0], lowerScreen[1], analysis.width * zoom, analysis.height * zoom)
	}
	else {
		analysis.image.onload = wordscapeViewDraw
	}
}

function drawModifyControls(context, control) {
	drawControls(context, control.view.modifyControls)
}

function drawPointsWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.context)
}

function drawPointsGrid(context, control) {
	var boundingBox = control.boundingBox
	var isColor = control.view.analysis.colorControl.getValue()
	var gridSpacing = getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier)
	var lowerOver = Vector.divide2DScalar(getPointByScreen(boundingBox[0], control), gridSpacing)
	var upperOver = Vector.divide2DScalar(getPointByScreen(boundingBox[1], control), gridSpacing)
	var halfGridSpacing = 0.5 * gridSpacing
	var floorX = gridSpacing * Math.floor(lowerOver[0])
	var ceilX = gridSpacing * Math.ceil(upperOver[0])
	var floorY = gridSpacing * Math.floor(upperOver[1])
	var ceilY = gridSpacing * Math.ceil(lowerOver[1])
	context.lineWidth = 0.7
	if (isColor) {
		context.lineWidth = 1.7
	}
	else {
		context.strokeStyle = 'black'
	}

	for (var x = floorX; x < ceilX + halfGridSpacing; x += gridSpacing) {
		setGridLineColor(context, gridSpacing, isColor, x)
		drawLine(context, convertPointToScreen([x, floorY], control), convertPointToScreen([x, ceilY], control))
	}

	for (var y = floorY; y < ceilY + halfGridSpacing; y += gridSpacing) {
		setGridLineColor(context, gridSpacing, isColor, y)
		drawLine(context, convertPointToScreen([floorX, y], control), convertPointToScreen([ceilX, y], control))
	}
}

function drawPointsMarker(context, control) {
	var view = control.view
	var analysis = view.analysis
	if (analysis.closestPointIndex == undefined) {
		return
	}

	var valueIndexes = analysis.valueIndexes
	context.lineWidth = 1.5
	if (analysis.colorControl.getValue()) {
		context.strokeStyle = Value.getValueDefault(gActionColorMap.get(view.editControl.getSelectedName()), 'black')
	}
	else {
		context.strokeStyle = 'black'
	}

	var marker = undefined
	var points = analysis.points
	var closestValueIndex = valueIndexes[analysis.closestPointIndex]
	var center = points[analysis.closestPointIndex]
	if (analysis.valueIsArrays[closestValueIndex] && analysis.isMarkerPoint) {
		var startIndex = 0
		for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
			var beforeValueIndex = valueIndexes[(vertexIndex + points.length - 1) % points.length]
			if (beforeValueIndex != closestValueIndex && valueIndexes[vertexIndex] == closestValueIndex) {
				startIndex = vertexIndex
				break
			}
		}
		var polyline = []
		for (var extraIndex = 0; extraIndex < points.length; extraIndex++) {
			vertexIndex = startIndex + extraIndex
			if (valueIndexes[vertexIndex] == closestValueIndex) {
				polyline.push(points[vertexIndex])
			}
			else {
				break
			}
		}
		var outlines = getOutlinesCheckIntersection(undefined, undefined, false, [[4, 4]], [polyline])
		marker = getLargestPolygon(outlines.filter(getIsCounterclockwise))
		convertPointsToScreen(marker, control)
	}
	else {
		var begin = points[(analysis.closestPointIndex + points.length - 1) % points.length]
		var end = points[(analysis.closestPointIndex + 1) % points.length]
		var rotationVector = [0.0, 0.0]
		var centerScreen = getScreenByPoint(center, control)
		var beginCenter = Vector.getSubtraction2D(centerScreen, getScreenByPoint(begin, control))
		var beginCenterLength = Vector.length2D(beginCenter)
		if (beginCenterLength > 0.0) {
			Vector.add2D(rotationVector, Vector.divide2DScalar(beginCenter, beginCenterLength))
		}
		var centerEnd = Vector.getSubtraction2D(getScreenByPoint(end, control), centerScreen)
		var centerEndLength = Vector.length2D(centerEnd)
		if (centerEndLength > 0.0) {
			Vector.add2D(rotationVector, Vector.divide2DScalar(centerEnd, centerEndLength))
		}
		var rotationVectorLength = Vector.length2D(rotationVector)
		if (rotationVectorLength > gClose) {
			marker = [[6,0], [-6,4], [-6,-4]]
			Vector.divide2DScalar(rotationVector, rotationVectorLength)
			rotate2DsVector(marker, rotationVector)
		}
		else {
			marker = [[5,-5], [5,5], [-5,5], [-5,-5]]
		}
		Vector.add2Ds(marker, centerScreen)
	}

	drawLines(context, marker)
}

function drawPointsUpdateGrid(context, control) {
	drawPointsWithoutArguments()
	viewBroker.view.analysis.displayAnalysisControl.draw(context)
	drawControls(context, viewBroker.view.analysis.displayAnalysisControl.controls)
}

function getAnalysisPoints(registry, statement) {
	var attributeMap = statement.attributeMap
	if (statement.tag == 'image') {
		if (attributeMap.has('href')) {
			var analysisPoints = new AnalysisPoints()
			analysisPoints.filename = attributeMap.get('href')
			analysisPoints.points = []
			return analysisPoints
		}
		noticeByList(['No href for image in viewpoints.', statement])
		return undefined
	}

	if (statement.lineIndex == undefined) {
		return undefined
	}

	if (!attributeMap.has('points')) {
		return undefined
	}

	var analysisPoints = new AnalysisPoints()
	var lineStatement = getStatement(registry.lines[statement.lineIndex])
	analysisPoints.points = []
	analysisPoints.statement = lineStatement
	lineStatement.children = statement.children
	lineStatement.originalStatement = statement
	lineStatement.lineIndex = statement.lineIndex
	lineStatement.parent = statement.parent
	lineStatement.variableMap = statement.variableMap
	analysisPoints.registry = registry		
	return analysisPoints
}

function getCommaSeparatedAddition(addition, decimalPlaces, valueStrings) {
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

function getDefinedValueStrings(analysis, valueStrings) {
	var secondCommaIndex = getIndexOfUnbracketed(valueStrings[1], ',')
	if (secondCommaIndex != -1) {
		valueStrings.push(valueStrings[1].slice(secondCommaIndex + 1).trim())
		valueStrings[1] = valueStrings[1].slice(0, secondCommaIndex).trim()
	}

	if (analysis.closestPointIndex == 0) {
		return valueStrings
	}

	var oldPoint = analysis.points[analysis.closestPointIndex - 1]
	for (var parameterIndex = 0; parameterIndex < 2; parameterIndex++) {
		if (valueStrings[parameterIndex] == '') {
			valueStrings[parameterIndex] = oldPoint[parameterIndex].toString()
		}
	}

	return valueStrings
}

function getDefinitionMap(definitions, statement) {
	var definitionMap = new Map()
	for (var definition of definitions) {
		var camelCase = getCamelCase(definition.text)
		definitionMap.set(camelCase, statement.attributeMap.get(camelCase))
	}

	return definitionMap
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
			arrayKit.pushArray(points, floats)
			arrayKit.pushArray(valueIndexes, new Array(floats.length).fill(floatListIndex))
		}
		else {
			arrayKit.setUndefinedElementsToArrayZero(floats, oldPoint)
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

	var indexOfEnd = getIndexOfUnbracketed(secondWord, ')')
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
	if (control.valueDefault == undefined) {
		return false
	}

	return Math.abs(control.value - control.valueDefault) < control.halfStepClose
}

function getIsPointControlCloseToDefault(control) {
	for (var slider of control.sliders) {
		if (!getIsFloatControlCloseToDefault(slider)) {
			return false
		}
	}

	return true
}

function getMouseMovementFlipped(event, scale) {
	var mouseMovementFlipped = getMouseMovement(event)
	if (mouseMovementFlipped == undefined) {
		return undefined
	}

	if (scale < 0.0) {
		mouseMovementFlipped[1] = -mouseMovementFlipped[1]
	}

	return mouseMovementFlipped
}

function getMovePointString(addition, analysis, closestValueIndex, values) {
	var arrayCommaIndex = -1
	var valueString = values[closestValueIndex]
	if (valueString.startsWith('Vector.getAddition2D')) {
		arrayCommaIndex = getIndexOfUnbracketed(valueString, ',', 1)
	}

	if (arrayCommaIndex == -1) {
		if (analysis.valueIsArrays[closestValueIndex]) {
			valueString = 'Vector.Vector.getAddition2Ds(' + valueString
		}
		else {
			var pointCommaIndex = getIndexOfUnbracketed(valueString, ',')
			if (pointCommaIndex != -1) {
				var valueStrings = [valueString.slice(0, pointCommaIndex).trim(), valueString.slice(pointCommaIndex + 1).trim()]
				return getCommaSeparatedAddition(addition, 1, getDefinedValueStrings(analysis, valueStrings))
			}
			valueString = 'Vector.Vector.getAddition2D(' + valueString
		}
		return valueString + ', [' + getFixedStrings(addition).join(',') + '])'
	}

	var afterComma = valueString.slice(arrayCommaIndex + 1, -1).trim()
	if (afterComma.startsWith('[')) {
		afterComma = afterComma.slice(1, -1)
	}

	Vector.add2D(addition, getFloatsUpdateByStatementValue(viewBroker.registry, analysis.statement, afterComma)[0])
	return valueString.slice(0, arrayCommaIndex) + ', [' + getFixedStrings(addition).join(',') + '])'
}

function getParameterPointString(control, valueString) {
	var sliders = control.sliders
	var controlPoint = new Array(sliders.length)
	for (var sliderIndex = 0; sliderIndex < sliders.length; sliderIndex++) {
		controlPoint[sliderIndex] = sliders[sliderIndex].value
	}

	var decimalPlaces = Value.getValueDefault(control.decimalPlaces, 1)
	if (arrayKit.getIsEmpty(valueString)) {
		if (getIsPointControlCloseToDefault(control)) {
			return undefined
		}
		return '[' + getFixedStrings(controlPoint, decimalPlaces) + ']'
	}

	var addition = Vector.getSubtraction2D(controlPoint, control.oldParameter)
	var arrayCommaIndex = -1
	if (valueString.startsWith('Vector.getAddition2D')) {
		arrayCommaIndex = getIndexOfUnbracketed(valueString, ',', 1)
	}

	var parameterString = undefined
	if (arrayCommaIndex == -1) {
		var trimmedString = valueString.trim()
		var trimmedStartsWithBracket = trimmedString.startsWith('[')
		if (trimmedStartsWithBracket) {
			trimmedString = trimmedString.slice(1, -1)
		}
		var pointCommaIndex = getIndexOfUnbracketed(trimmedString, ',')
		if (pointCommaIndex != -1) {
			var valueStrings = [trimmedString.slice(0, pointCommaIndex).trim(), trimmedString.slice(pointCommaIndex + 1).trim()]
			var commaSeparatedAddition = getCommaSeparatedAddition(addition, decimalPlaces, valueStrings)
			if (commaSeparatedAddition.indexOf('+') == -1 && getIsPointControlCloseToDefault(control)) {
				return undefined
			}
			if (trimmedStartsWithBracket) {
				return '[' + commaSeparatedAddition + ']'
			}
			return commaSeparatedAddition
		}
		parameterString = 'Vector.Vector.getAddition2D(' + valueString
	}
	else {
		var afterComma = valueString.slice(arrayCommaIndex + 1, -1).trim()
		if (afterComma.startsWith('[')) {
			afterComma = afterComma.slice(1, -1)
		}
		Vector.add2D(addition, getFloatsUpdateByStatementValue(viewBroker.registry, view.analysis.statement, afterComma)[0])
		parameterString = valueString.slice(0, arrayCommaIndex)
	}

	return parameterString + ', [' + getFixedStrings(addition, decimalPlaces).join(',') + '])'
}

function getParameterValueString(control, valueString) {
	if (arrayKit.getIsEmpty(valueString)) {
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

function getPointByEvent(control, event) {
	return getPointByScreen([event.offsetX, event.offsetY], control)
}

function getPointByScreen(screenPoint, control) {
	var y = screenPoint[1]
	if (control.scale < 0.0) {
		y = control.boundingBox[1][1] - y
	}
	else {
		y -= control.boundingBox[0][1]
	}

	var point = [screenPoint[0] - control.boundingBox[0][0], y]
	Vector.subtract2D(point, control.halfSize)
	Vector.divide2DScalar(point, getExponentialZoom())
	Vector.add2D(point, control.halfSize)
	return Vector.subtract2D(point, control.centerOffset)
}

function getScreenByPoint(point, control) {
	return convertPointToScreen(point.slice(0, 2), control)
}

function getValuesSetVariableMap(statement, value) {
	var values = getValues(value)
	var variableMap = getVariableMapByStatement(statement)
	variableMap.set('_values', values)
	return values
}

class InspectPoints extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(context) {
		var view = this.view
		var analysis = view.analysis
		var boundingBox = view.analysis.analysisBoundingBox
		var points = view.analysis.points
		clearBoundingBox(boundingBox, context)
		if (arrayKit.getIsEmpty(points)) {
			return
		}

		setTextContext(context)
		var titleTop = boundingBox[0][1] + viewCanvas.textSpace
		var y = titleTop + viewCanvas.textSpace
		var pointsBox = getBoundingBox(points)
		var size = Vector.getSubtraction2D(pointsBox[1], pointsBox[0])
		drawArrays(context, 'X: Y:'.split(' '), viewCanvas.textSpace, viewBroker.analysisCharacterBegin, y)
		context.fillText('Lower', viewBroker.analysisLowerBegin, titleTop)
		drawNumericArrays(context, pointsBox[0], viewCanvas.textSpace, viewBroker.analysisLowerBegin, y)
		context.fillText('Upper', viewBroker.analysisUpperBegin, titleTop)
		drawNumericArrays(context, pointsBox[1], viewCanvas.textSpace, viewBroker.analysisUpperBegin, y)
		context.fillText('Size', viewBroker.analysisSizeBegin, titleTop)
		drawNumericArrays(context, size, viewCanvas.textSpace, viewBroker.analysisSizeBegin, y)
		y += viewCanvas.textSpace * (pointsBox[0].length + 1)
		context.fillText('Number of Points: ' + analysis.points.length, viewBroker.analysisCharacterBegin, y)
		y += viewCanvas.textSpace * 2
		if (this.mousePoint == undefined || analysis.closestPointIndex == undefined) {
			return
		}

		var closestPointIndex = analysis.closestPointIndex
		context.fillText('Point Index: ' + closestPointIndex, viewBroker.analysisCharacterBegin, y)
		y += viewCanvas.textSpace
		var closestValueIndex = analysis.valueIndexes[closestPointIndex]
		context.fillText('Value Index: ' + closestValueIndex, viewBroker.analysisCharacterBegin, y)
		y += viewCanvas.textSpace
		var analysisWidth = boundingBox[1][0] - viewBroker.analysisCharacterBegin - viewCanvas.textHeight * 2.5
		var value = getValues(view.analysis.pointString)[closestValueIndex]
		var valueTextLength = getTextLength('Value: ' + value) * viewCanvas.textHeight
		if (valueTextLength > analysisWidth) {
			value = value.slice(0, Math.floor(value.length * analysisWidth / valueTextLength)) + '..'
		}

		context.fillText('Value: ' + value, viewBroker.analysisCharacterBegin, y)
		titleTop = y + viewCanvas.textSpace * 2.0
		y = titleTop + viewCanvas.textSpace
		drawArrays(context, 'X: Y:'.split(' '), viewCanvas.textSpace, viewBroker.analysisCharacterBegin, y)
		context.fillText('Mouse', viewBroker.analysisUpperBegin, titleTop)
		drawNumericArrays(context, this.mousePoint, viewCanvas.textSpace, viewBroker.analysisUpperBegin, y)
		if (this.change == undefined) {
			return
		}

		context.fillText('Last', viewBroker.analysisLowerBegin, titleTop)
		drawNumericArrays(context, this.lastDisplay, viewCanvas.textSpace, viewBroker.analysisLowerBegin, y)
		context.fillText('Change', viewBroker.analysisSizeBegin, titleTop)
		drawNumericArrays(context, this.change, viewCanvas.textSpace, viewBroker.analysisSizeBegin, y)
	}
	name = 'Inspect'
}

class Mouse extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(context) {
		var view = this.view
		var boundingBox = view.analysis.analysisBoundingBox
		clearBoundingBox(boundingBox, context)
		if (view.mouseScreenPoint == undefined) {
			return
		}

		var y = boundingBox[0][1] + viewCanvas.textSpace
		setTextContext(context)
		drawArrays(context, 'X: Y:'.split(' '), viewCanvas.textSpace, viewBroker.analysisCharacterBegin, y)
		var point = getPointByScreen(view.mouseScreenPoint, view.viewControl)
		drawNumericArrays(context, point, viewCanvas.textSpace, viewBroker.analysisSizeBegin, y)
	}
	name = 'Mouse'
}

function mouseDownPointsInspect(context, control, event) {
	var view = control.view
	var analysis = view.analysis
	var points = analysis.points
	if (points.length == 0) {
		return
	}

	var inspectControl = analysis.inspectControl
	if (analysis.analysisControl.getValue() < 3) {
		analysis.analysisControl.setValue(1)
	}

	updateClosestPointIndex()
	analysis.analysisControl.draw(context)
	inspectControl.mousePoint = points[analysis.closestPointIndex]
	inspectControl.change = undefined
	if (inspectControl.last != undefined) {
		inspectControl.change = Vector.getSubtraction2D(inspectControl.mousePoint, inspectControl.last)
		inspectControl.change.push(Vector.length2D(inspectControl.change))
		inspectControl.lastDisplay = inspectControl.last
		if (inspectControl.change[2] < gClose) {
			inspectControl.change = undefined
		}
	}

	drawControls(context, analysis.shapeControls)
	inspectControl.last = inspectControl.mousePoint
}

function mouseDownReverse(context, control, event) {
	var analysis = control.view.analysis
	analysis.points.reverse()
	outputPointsDrawPoints(analysis. context)
}

var moveManipulator = {
mouseMove: function(context, event) {
	var viewControl = viewBroker.view.viewControl
	var mouseMovementFlipped = getMouseMovementFlipped(event, viewControl.scale)
	if (mouseMovementFlipped == undefined) {
		return
	}

	Vector.divide2DScalar(mouseMovementFlipped, getExponentialZoom())
	viewControl.centerOffset = Vector.getAddition2D(mouseMovementFlipped, viewCanvas.mouseDownCenterOffset)
	if (event.shiftKey) {
		Vector.stepArray(viewControl.centerOffset, getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier))
	}

	drawPointsWithoutArguments()
},

mouseOut: function(context, event) {
	viewBroker.view.viewControl.centerOffset = viewCanvas.mouseDownCenterOffset
	pointsMouseOut()
},

mouseUp: function(context, event) {
	var viewControl = viewBroker.view.viewControl
	var mouseMovementFlipped = getMouseMovementFlipped(event, viewControl.scale)
	if (mouseMovementFlipped == undefined) {
		this.mouseOut(context, event)
		return
	}
	pointsMouseOut()
}
}

function movePointByEvent(event, manipulator, mouseMovementFlipped, view) {
	if (!isPointInsideBoundingBox(view.viewControl.boundingBox, [event.offsetX, event.offsetY])) {
		return
	}

	var analysis = view.analysis
	var closestValueIndex = analysis.valueIndexes[analysis.closestPointIndex]
	var values = manipulator.oldValues.slice(0)
	var addition = Vector.divide2DScalar(mouseMovementFlipped, getExponentialZoom())
	if (event.shiftKey) {
		var point = Vector.getAddition2D(manipulator.oldPoints[analysis.closestPointIndex], addition)
		Vector.subtract2D(addition, point)
		Vector.stepArray(point, getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier))
		Vector.add2D(addition, point)
	}

	values[closestValueIndex] = getMovePointString(addition, analysis, closestValueIndex, values)
	setPointsInput(analysis, values.join(' '))
}

var movePointManipulator = {
	mouseMove: function(context, event) {
		var view = viewBroker.view
		var mouseMovementFlipped = getMouseMovementFlipped(event, view.viewControl.scale)
		if (mouseMovementFlipped == undefined) {
			return
		}

		movePointByEvent(event, this, mouseMovementFlipped, view)
		pointsMouseMove(event)
	},
	mouseOut: function(context, event) {
		viewBroker.view.analysis.points = arrayKit.getArraysCopy(this.oldPoints)
		pointsMouseOut()
	},
	mouseUp: function(context, event) {
		var view = viewBroker.view
		var mouseMovementFlipped = getMouseMovementFlipped(event, view.viewControl.scale)
		if (mouseMovementFlipped == undefined) {
			this.mouseOut(context, event)
			return
		}

		movePointByEvent(event, this, mouseMovementFlipped, view)
		pointsMouseUp()
		drawControls(context, view.analysis.shapeControls)
	}
}

function outputPointsDrawPoints(analysis, context) {
	var fittedString = ''
	var points = analysis.points
	if (points.length > 0) {
		var boundingBox = getBoundingBox(points)
		var minimumPoint = boundingBox[0]
		var size = Vector.getSubtraction2D(boundingBox[1], minimumPoint)
		var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
		var multiplier = 100.0 / maximumDimension
		for (var fittedIndex = 0; fittedIndex < points.length; fittedIndex++) {
			var point = points[fittedIndex]
			var x = multiplier * (point[0] - minimumPoint[0])
			var y = multiplier * (point[1] - minimumPoint[1])
			fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
		}
	}

//	console.log(fittedString)
	analysis.inspectControl.draw(context)
	drawPointsWithoutArguments()
}

class PointsControl extends CanvasControl {
	constructor(boundingBox, halfSize, matrix2D) {
		super()
		this.boundingBox = boundingBox
		this.centerOffset = [viewCanvas.controlWidth, viewCanvas.controlWidth]
		this.clipBox = boundingBox
		this.halfSize = halfSize
		this.scale = 1
		if (matrix2D != undefined) {
			this.scale = matrix2D[3]
		}
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var view = this.view
		var analysis = view.analysis
		clearBoundingBox(boundingBox, context)
		if (analysis.gridControl.getValue()) {
			drawPointsGrid(context, this, view)
		}
		analysis.drawShape(boundingBox, context, this)
	}
	mouseDownPrivate(context, event) {
		var view = this.view
		var analysis = view.analysis
		var name = view.editControl.getSelectedName()
		var point = getPointByEvent(this, event)
		var points = analysis.points
		var pointString = analysis.pointString
		if (name == 'Add') {
			var values = getValues(pointString)
			values.splice(analysis.addValueIndex, 0, view.mouseMovePoint.toString())
			setPointsInput(analysis, values.join(' '))
			outputPointsDrawPoints(analysis, context)
			return
		}

		if (name == 'Delete') {
			var closestPointIndex = getClosestPointIndex(point, analysis.points)
			if (closestPointIndex == undefined) {
				return
			}
			var values = getValues(pointString)
			values.splice(analysis.valueIndexes[closestPointIndex], 1)
			setPointsInput(analysis, values.join(' '))
			updateOutputDrawPoints(context, view)
			return
		}

		if (name == 'Move Point') {
			if (analysis.points.length > 0) {
				viewCanvas.mouseMoveManipulator = movePointManipulator
				movePointManipulator.oldPoints = arrayKit.getArraysCopy(analysis.points)
				movePointManipulator.oldValues = getValues(pointString)
				analysis.closestPointIndex = getClosestPointIndex(point, analysis.points)
			}
			return
		}

		if (name == 'Inspect') {
			mouseDownPointsInspect(context, this, event)
			return
		}

		viewCanvas.mouseDownCenterOffset = this.centerOffset
		viewCanvas.mouseMoveManipulator = moveManipulator
	}
}

function pointsMouseMove(event) {
	drawPointsWithoutArguments()
}

function pointsMouseOut() {
	drawPointsWithoutArguments()
	viewCanvas.mouseDown2D = undefined
	viewCanvas.mouseMoveManipulator = undefined
}

function pointsMouseUp() {
	outputPointsDrawPoints(viewBroker.view.analysis, viewBroker.context)
	viewCanvas.mouseDown2D = undefined
	viewCanvas.mouseMoveManipulator = undefined
}

class PolylineControl extends CanvasControl {
constructor() {
	super()
}

drawPrivate(context) {
	var view = this.view
	var analysis = view.analysis
	clearBoundingBox(analysis.analysisBoundingBox, context)
	removeByGeneratorName(view.controls, 'Polyline')
	if (arrayKit.getIsEmpty(analysis.points) || analysis.closestPointIndex == undefined) {
		return
	}

	var closestValueIndex = view.analysis.valueIndexes[analysis.closestPointIndex]
	if (!analysis.valueIsArrays[closestValueIndex]) {
		return
	}

	createPolylineDefinitionsMap()
	var values = getValues(analysis.pointString)
	for (var polylineDefinitionsKey of gPolylineDefinitionsMap.keys()) {
		var functionValues = getFunctionValuesByName(values[closestValueIndex], polylineDefinitionsKey)
		if (functionValues != undefined) {
			this.titleTop = analysis.analysisBoundingBox[0][1] + viewCanvas.textSpace
			setTextContext(context)
			context.fillText(polylineDefinitionsKey, viewBroker.analysisCharacterBegin, this.titleTop)
			this.titleTop += viewCanvas.halfTextSpace
			var controlsTop = this.titleTop
			var height = viewBroker.canvas.height
			var width = viewBroker.canvas.width
			this.controlsClipBox = [[height, controlsTop], [width, height]]
			this.controls = []
			var definitionsLength = gPolylineDefinitionsMap.get(polylineDefinitionsKey).length
			for (var parameterIndex = 0; parameterIndex < definitionsLength; parameterIndex++) {
				addPolylineControl(closestValueIndex, functionValues, parameterIndex, polylineDefinitionsKey, values, view)
			}
			addScrollBarDraw(context, this, controlsTop)
			return
		}
	}
}

name = 'Polyline'
}

function polylineBoolean(context, control) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	control.functionValues[control.parameterIndex] = getValueStringIfDifferent(control.getValue(), control.defaultState)
	arrayKit.removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsInput(viewBroker.view.analysis, values.join(' '))
	updateOutputDrawPoints(context, viewBroker.view)
}

function polylinePoint(context, control) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	var functionValue = control.oldFunctionValues[control.parameterIndex]
	control.functionValues[control.parameterIndex] = getParameterPointString(control, functionValue)
	arrayKit.removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsInput(viewBroker.view.analysis, values.join(' '))
	updateOutputDrawPoints(context, viewBroker.view)
}

function polylineValue(context, control) {
	var closestValueIndex = control.closestValueIndex
	var values = control.oldValues.slice(0)
	var valueString = values[closestValueIndex]
	var functionValue = control.oldFunctionValues[control.parameterIndex]
	control.functionValues[control.parameterIndex] = getParameterValueString(control, functionValue)
	arrayKit.removeLastEmpties(control.functionValues)
	var indexes = getFunctionSliceIndexesByName(valueString, control.polylineDefinitionsKey)
	values[closestValueIndex] = valueString.slice(0, indexes[0]) + control.functionValues.join(',') + valueString.slice(indexes[1])
	setPointsInput(viewBroker.view.analysis, values.join(' '))
	updateOutputDrawPoints(context, viewBroker.view)
}

function scrollControls(context, control) {
	var controls = control.parent.controls
	var down = control.value
	clearBoundingBox(control.parent.controlsClipBox, context)
	for (var childControl of controls) {
		var boundingBox = arrayKit.getArraysCopy(childControl.oldBoundingBox)
		boundingBox[0][1] += down
		boundingBox[1][1] += down
		childControl.resize(boundingBox)
	}

	drawControls(context, controls)
}

function setGridLineColor(context, gridSpacing, isColor, value) {
	if (!isColor) {
		return
	}

	var valueOverSpacing = Math.round(Math.abs(value / gridSpacing))
	if (valueOverSpacing == 0) {
		context.strokeStyle = 'lime'
		return
	}

	if (valueOverSpacing % 5 == 0) {
		context.strokeStyle = 'violet'
//		context.strokeStyle = '#3A5F0B' // Green Leaves
		return
	}

	context.strokeStyle = '#7070e0'
}

function setPointsInput(analysis, pointString) {
	document.getElementById('pointsInputID').value = pointString
	analysis.pointString = pointString
	setValueIndexesTagPoints(analysis)
}

function setStatementToKeyValue(statement, key, value) {
	var lineIndex = statement.lineIndex
	var lines = viewBroker.registry.lines
	var line = lines[lineIndex]
	var linePointsValue = statement.attributeMap.get(key)
	if (value == undefined) {
		lines[lineIndex] = getLineByKeySearchReplace(line, key, linePointsValue)
		statement.attributeMap.delete(key)
		return
	}

	if (linePointsValue == undefined) {
		line = line.trim()
		var indexOfSpace = line.indexOf(' ')
		if (indexOfSpace != -1 && !arrayKit.getIsEmpty(value)) {
			lines[lineIndex] = line.slice(0, indexOfSpace) + ' ' + key + '=' + value + line.slice(indexOfSpace)
		}
	}
	else {
		lines[lineIndex] = getLineByKeySearchReplace(line, key, linePointsValue, value)
	}

	statement.attributeMap.set(key, value)
}

function setTagInput(statement) {
	var processor = gTagCenterMap.get(statement.tag)
	if (processor.getDefinitions == undefined) {
		return
	}

	var definitionMap = getDefinitionMap(processor.getDefinitions(), statement)
	var tagStrings = []
	for (var entry of definitionMap) {
		if (entry[1] != undefined) {
			tagStrings.push(entry[0] + '=' + entry[1])
		}
	}

	document.getElementById('tagInputID').value = tagStrings.join(' ')
}

function setValueIndexesTagPoints(analysis) {
	var pointString = analysis.pointString
	var view = viewBroker.view
	var statement = analysis.statement
	if (statement == undefined) {
		var values = getValues(pointString)
		analysis.points = new Array(values.length)
		analysis.valueIndexes = arrayKit.getSequence(values.length)
		analysis.valueIsArrays = new Array(values.length).fill(false)
		for (var valueIndex = 0; valueIndex < values.length; valueIndex++) {
			analysis.points[valueIndex] = values[valueIndex].split(',').map(parseFloat)
		}
		return
	}

	var registry = viewBroker.registry
	analysis.valueIndexes = []
	analysis.valueIsArrays = []
	analysis.points = getFloatListsByStatementValue(registry, statement, pointString, analysis.valueIndexes, analysis.valueIsArrays)
	var matrix2D = getMatrix2D(registry, statement)
	if (matrix2D != undefined) {
		transform2DPoints(matrix2D, analysis.points)
	}

	var attributeMap = statement.attributeMap
	var tag = statement.tag
	var oldAttributeMap = new Map(attributeMap)
	var oldChildren = statement.children
	for (var child of statement.originalStatement.children) {
		child.parent = statement
	}

	var oldNestingIncrement = statement.nestingIncrement
	var oldTag = statement.tag
	if (attributeMap.has('alteration')) {
		var alterationString = attributeMap.get('alteration')
		var alterations = alterationString.replaceAll(',', ' ').split(' ').filter(lengthCheck)
		var indexOfView = alterations.indexOf('view')
		alterations.splice(indexOfView, 1)
		attributeMap.set('alteration', alterations.join(' '))
	}

	attributeMap.set('points', pointString)
	var processor = gTagCenterMap.get(tag)
	if (processor.getDefinitions != undefined) {
		var definitionMap = getDefinitionMap(processor.getDefinitions(), statement)
		var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(document.getElementById('tagInputID').value)))
		for (var key of definitionMap.keys()) {
			if (tagMap.has(key)) {
				attributeMap.set(key, tagMap.get(key))
			}
			else {
				attributeMap.delete(key)
			}
		}
	}

	processor.processStatement(registry, statement)
	analysis.processedTag = statement.tag
	analysis.tagPointArrays = getChainPointListsHDRecursively(statement.parent, 1, registry, statement, 'polyline')
	addPolygonsToPolylines(analysis.tagPointArrays, getChainPointListsHDRecursively(statement.parent, 1, registry, statement, 'polygon'))
	statement.attributeMap = oldAttributeMap
	statement.children = oldChildren
	for (var child of statement.originalStatement.children) {
		child.parent = statement.originalStatement
	}

	statement.nestingIncrement = oldNestingIncrement
	statement.tag = oldTag
}

function setValueUpdateDrawPoints(context, control) {
	var view = control.view
	setValueIndexesTagPoints(view.analysis)
	updateStatementOnly(view.analysis)
	updateOutputDrawPoints(context, view)
}

class Tag extends CanvasControl {
	constructor() {
		super()
	}
	drawPrivate(context) {
		var view = this.view
		var analysis = view.analysis
		clearBoundingBox(analysis.analysisBoundingBox, context)
		removeByGeneratorName(view.controls, 'Tag')
		var statement = analysis.statement
		if (arrayKit.getIsEmpty(analysis.points) || statement == undefined) {
			return
		}

		this.titleTop = analysis.analysisBoundingBox[0][1] + viewCanvas.textSpace
		setTextContext(context)
		context.fillText(statement.tag, viewBroker.analysisSizeBegin, this.titleTop)
		var processor = gTagCenterMap.get(statement.tag)
		if (processor.getDefinitions == undefined) {
			return
		}

		var definitionMap = getDefinitionMap(processor.getDefinitions(), statement)
		this.titleTop += viewCanvas.halfTextSpace
		var controlsTop = this.titleTop
		var height = viewBroker.canvas.height
		var width = viewBroker.canvas.width
		this.controlsClipBox = [[height, controlsTop], [width, height]]
		this.controls = []
		for (var definition of processor.getDefinitions()) {
			addTagControl(definition, definitionMap, view)
		}

		addScrollBarDraw(context, this, controlsTop)
	}
	name = 'Tag'
}

function tagBoolean(context, control) {
	var key = getCamelCase(control.text)
	var tagInput = document.getElementById('tagInputID')
	var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(tagInput.value)))
	if (control.getValue() == control.defaultState) {
		tagInput.value = getLineByKeySearchReplace(tagInput.value, key, tagMap.get(key))
	}
	else {
		tagInput.value = getLineByKeyMapReplace(tagInput.value, key, tagMap, control.getValue().toString())
	}

	setValueUpdateDrawPoints(context, control)
}

function tagPoint(context, control) {
	var key = getCamelCase(control.text)
	var tagInput = document.getElementById('tagInputID')
	var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(tagInput.value)))
	var parameterString = getParameterPointString(control, control.oldParameterString)
	if (parameterString == undefined) {
		tagInput.value = getLineByKeySearchReplace(tagInput.value, key, tagMap.get(key))
	}
	else {
		tagInput.value = getLineByKeyMapReplace(tagInput.value, key, tagMap, parameterString)
	}

	setValueUpdateDrawPoints(context, control)
}

function tagValue(context, control) {
	var key = getCamelCase(control.text)
	var tagInput = document.getElementById('tagInputID')
	var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(tagInput.value)))
	var parameterString = getParameterValueString(control, control.oldParameterString)
	if (parameterString == undefined) {
		tagInput.value = getLineByKeySearchReplace(tagInput.value, key, tagMap.get(key))
	}
	else {
		tagInput.value = getLineByKeyMapReplace(tagInput.value, key, tagMap, parameterString)
	}

	setValueUpdateDrawPoints(context, control)
}

function updateClosestPointIndex() {
	var view = viewBroker.view
	var analysis = view.analysis
	var point = getPointByScreen(view.mouseScreenPoint, view.viewControl)
	if (point == undefined) {
		return
	}

	var addPointIndex = undefined
	var addValueIndex = undefined
	var closestPointIndex = undefined
	var isMarkerPoint = undefined
	var points = analysis.points
	if (points.length > 0) {
		var name = view.editControl.getSelectedName()
		closestPointIndex = getClosestPointIndex(point, points)
		if (name == 'Move Point' || name == 'Move Shape' || name == 'Delete') {
//		if (name == 'Move Point' || name == 'Delete') {
			isMarkerPoint = true
		}
		else {
			if (name == 'Add') {
				if (isPointInsideBoundingBox(view.viewControl.boundingBox, view.mouseScreenPoint)) {
					if (event.shiftKey) {
						Vector.stepArray(point, getIntegerStep(getHeightMinusOverZoom() * gGridSpacingMultiplier))
					}

					var valueIndexes = analysis.valueIndexes
					var closestValueIndex = valueIndexes[closestPointIndex]
					var valuesLength = valueIndexes[valueIndexes.length - 1] + 1
					var beginValueIndex = (closestValueIndex - 1 + valuesLength) % valuesLength
					var endValueIndex = (closestValueIndex + 1) % valuesLength
					var beginIndex = 0
					for (; beginIndex < points.length; beginIndex++) {
						addPointIndex = (beginIndex + 1) % points.length
						if (valueIndexes[beginIndex] == beginValueIndex && valueIndexes[addPointIndex] == closestValueIndex) {
							break
						}
					}
					var endIndex = 0
					var previousIndex = 0
					for (; endIndex < points.length; endIndex++) {
						previousIndex = (endIndex - 1 + points.length) % points.length
						if (valueIndexes[endIndex] == endValueIndex && valueIndexes[previousIndex] == closestValueIndex) {
							break
						}
					}
					addValueIndex = closestValueIndex
					var distanceBegin = getDistanceToLineSegment(points[beginIndex], points[addPointIndex], point)
					var distanceEnd = getDistanceToLineSegment(points[previousIndex], points[endIndex], point)
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

		if (name == 'Move Point' || name == 'Move Shape' || name == 'Delete' || name == 'Inspect') {
//		if (name == 'Move Point' || name == 'Delete' || name == 'Inspect') {
			if (name != 'Inspect') {
				isMarkerPoint = true
			}
		}
	}

	if (analysis.closestPointIndex != closestPointIndex || analysis.isMarkerPoint != isMarkerPoint || view.mouseMovePoint != point) {
		analysis.addPointIndex = addPointIndex
		analysis.addValueIndex = addValueIndex
		analysis.closestPointIndex = closestPointIndex
		analysis.isMarkerPoint = isMarkerPoint
		view.mouseMovePoint = point
		drawPointsWithoutArguments()
	}
}

function updateOutputDrawPoints(context, view) {
	updateClosestPointIndex()
	outputPointsDrawPoints(view.analysis, context)
}

function updateStatement() {
	var analysis = viewBroker.view.analysis
	updateStatementOnly(analysis)
	var lines = viewBroker.registry.lines
	document.getElementById('wordAreaID').value = lines.join(getEndOfLine(document.getElementById('wordAreaID').value))
	setValueIndexesTagPoints(analysis)
	outputPointsDrawPoints(analysis, viewBroker.context)
	drawControls(viewBroker.context, analysis.shapeControls)
}

function updateStatementOnly(analysis) {
	var statement = analysis.statement
	analysis.pointString = document.getElementById('pointsInputID').value
	setStatementToKeyValue(statement, 'points', analysis.pointString)
	var processor = gTagCenterMap.get(statement.tag)
	if (processor.getDefinitions != undefined) {
		var definitionMap = getDefinitionMap(processor.getDefinitions(), statement)
		var tagMap = new Map(getAttributes(getQuoteSeparatedSnippets(document.getElementById('tagInputID').value)))
		for (var key of definitionMap.keys()) {
			setStatementToKeyValue(statement, key, tagMap.get(key))
		}
	}
}

class ViewPoints {
	constructor(analysis, id) {
		this.analysis = analysis
		this.id = id
	}
	draw(context) {
		drawControls(context, this.controls, this)
	}
	mouseDown(context, event) {
		mouseDownControls(context, this.controls, event)
	}
	mouseMove(context, event) {
		this.mouseScreenPoint = [event.offsetX, event.offsetY]
		if (viewCanvas.mouseMoveManipulator == undefined) {
			updateClosestPointIndex()
		}
		else {
			viewCanvas.mouseMoveManipulator.mouseMove(context, event)
		}

		this.analysis.mouseControl.draw(context)
	}
	mouseOut(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			viewCanvas.mouseMoveManipulator.mouseOut(context, event)
		}
	}
	mouseUp(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			viewCanvas.mouseMoveManipulator.mouseUp(context, event)
		}
	}
	start() {
		var controls = []
		var controlWidth = viewCanvas.controlWidth
		var height = viewBroker.canvas.height
		var valueMap = viewCanvas.valueMap
		var width = viewBroker.canvas.width
		this.controls = controls
		var intervals = Vector.intervalsFromToQuantity(0.0, height, 6, false)
		intervals.forEach(Math.round)

		var bottomIntervals = Vector.intervalsFromToQuantity(0.0, height, 3, false)
		bottomIntervals.forEach(Math.round)
		var reverseButton = new Button([[0.0, viewBroker.heightMinus], [bottomIntervals[0], height]], 'Reverse')
		reverseButton.onClick = mouseDownReverse
		controls.push(reverseButton)

		var viewBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		var halfSize = Vector.multiply2DScalar(Vector.getSubtraction2D(viewBoundingBox[1], viewBoundingBox[0]), 0.5)
		this.viewControl = new PointsControl(viewBoundingBox, halfSize, getChainMatrix2D(this.analysis.registry, this.analysis.statement))
		controls.push(this.viewControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawPointsUpdateGrid
		controls.push(this.zoomControl)

		var texts = ['Add', 'Move Point', 'Delete', 'Inspect', 'Move View']
		this.editControl = new Choice([[0, 0], [intervals[4], controlWidth]], texts)
		this.editControl.controlChanged = updateClosestPointIndex
		this.editControl.setValue(3)
		controls.push(this.editControl)
		controls.push(this.analysis)
		setViewControls(controls, this)
		this.analysis.start()
	}
}
