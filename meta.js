//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gAlterationsDisplay = ['alterations', 'display']
const gAlterationsSet = new Set(gAlterationsDisplay)
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gPointsWorkSet = new Set(['points', 'pointsHD', 'work'])
const gSetR = new Set(['r'])
const gSetS = new Set(['s'])
const gSetRS = new Set(['r', 's'])

function addCSVToMeshArea(id, mesh, registry) {
	addToMeshArea(getCSVMeshString(getNullOrValue('date', registry.storageMap), id, mesh, getNullOrValue('project', registry.storageMap)))
}

function addFunctionToVariableEntries(functionToAdd, optionSet) {
	addFunctionToEntriesByName(functionToAdd, gVariableMapEntries, functionToAdd.name, optionSet)
}

function addFunctionToEntriesByName(functionToAdd, mapEntries, name, optionSet) {
	functionToAdd.optionSet = optionSet
	mapEntries.push([name, functionToAdd])
}

function addStatementRecursively(depth, parent, registry, workStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addStatementRecursively reached, no further statements will be added.'
		warningByList([warningText, parent, gRecursionLimit])
		return
	}
	var statement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, parent, workStatement.tag)
	getUniqueID(parent.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, statement)
	copyMissingKeysExcept(gAlterationsSet, workStatement.attributeMap, statement.attributeMap)
	parent.children.push(statement)
	if (statement.nestingIncrement == 1) {
		for (var child of workStatement.children) {
			addStatementRecursively(depth + 1, statement, registry, child)
		}
	}
}

function addSTLToMeshArea(id, mesh) {
	addToMeshArea(getSTLMeshString(id, mesh))
}

function addVariableObjectToEntries(map, variableObject) {
	var propertyNames = Object.getOwnPropertyNames(variableObject)
	for (var propertyName of propertyNames) {
		if (gLowerCharacterSet.has(propertyName[0])) {
			map.set(propertyName, variableObject[propertyName])
			variableObject[propertyName].optionSet = null
		}
		else {
			map.set(propertyName, variableObject[propertyName].toString())
		}
	}
	return map
}

function alterChildrenRecursively(children, depth, registry, rootStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in alterChildrenRecursively reached, no further statements will be processed.'
		warningByList([warningText, children, gRecursionLimit])
		return
	}
	if (getIsEmpty(children)) {
		return
	}
	depth += 1
	for (var child of children) {
		alterChildrenRecursively(child.children, depth, registry, rootStatement)
		copyMissingKeysExcept(gPointsWorkSet, rootStatement.attributeMap, child.attributeMap)
		alterStatementPoints(registry, child)
	}
}

function alterStatementPoints(registry, statement) {
	var id = statement.attributeMap.get('id')
	if (registry.generatorMap.has(id)) {
		var meshGenerator = registry.generatorMap.get(id)
		if (meshGenerator != null) {
			var mesh = meshGenerator.getMesh()
			if (mesh != null) {
				alterMeshExcept(mesh, registry, statement, statement.tag)
			}
		}
		return
	}
	var points = getPointsHD(registry, statement)
	if (points != null) {
		setPointsHD(getPointsExcept(points, registry, statement, statement.tag), statement)
	}
}

function arcFromToAngle(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	var from = [-1.0, 0.0]
	var oldPoint = []
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			oldPoint = points[points.length - 1]
			if (oldPoint.length > 0) {
				from[0] = oldPoint[0]
				if (oldPoint.length > 1) {
					from[1] = oldPoint[1]
				}
			}
		}
	}
	from = [getValueByDefault(from[0], fromX), getValueByDefault(from[1], fromY)]
	var isOldPoint = false
	if (oldPoint.length > 1) {
		if (from[0] == oldPoint[0] && from[1] == oldPoint[1]) {
			isOldPoint = true
		}
	}
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtractXY(to.slice(0), from)
	var fromToLength = getXYLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiplyXYByScalar(addXY(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	var radius = halfFromToLength
	var isInverted = false
	if (angle != undefined) {
		angle *= gRadiansPerDegree
		if (Math.abs(angle) < gClose) {
			return [from, to]
		}
		if (angle < 0.0) {
			isInverted = true
			angle = -angle
		}
		var halfAngle = 0.5 * angle
		var right = [fromTo[1], -fromTo[0]]
		var perpendicularAngle = 0.5 * Math.PI - halfAngle
		multiplyXYByScalar(right, 0.5 * Math.tan(perpendicularAngle))
		if (isInverted) {
			subtractXY(center, right)
		}
		else {
			addXY(center, right)
		}
		radius = Math.sqrt(halfFromToLength * halfFromToLength + getXYLengthSquared(right))
	}

	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	if (isInverted) {
		fromAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi)
	var arcFromToRadius = []
	if (!isOldPoint) {
		arcFromToRadius.push(from)
	}
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcFromToRadius.push(addXY(getXYPolarByRadius(fromAngle, radius), center))
	}
	arcFromToRadius.push(to)
	return arcFromToRadius
}

//deprecated23
function arcFromToCenter(fromX, fromY, toX, toY, radius, isClockwise, numberOfSides) {
	var from = [getValueByDefault(-1.0, fromX), getValueByDefault(0.0, fromY)]
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtractXY(to.slice(0), from)
	var fromToLength = getXYLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiplyXYByScalar(addXY(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	if (radius == undefined) {
		radius = halfFromToLength
	}
	else {
		if (radius > halfFromToLength) {
			multiplyXYByScalar(fromTo, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
			var right = [fromTo[1], -fromTo[0]]
			if (isClockwise) {
				addXY(center, right)
			}
			else {
				subtractXY(center, right)
			}
		}
		else {
			radius = halfFromToLength
		}
	}
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * angleDifference / gDoublePi)
	var arcFromToCenter = new Array(numberOfArcSides + 1)
	arcFromToCenter[0] = from
	arcFromToCenter[numberOfArcSides] = to
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcFromToCenter[pointIndex] = addXY(getXYPolarByRadius(fromAngle, radius), center)
	}
	return arcFromToCenter
}

function arcFromToRadius(registry, statement, fromX, fromY, toX, toY, radius, isClockwise, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	var from = [-1.0, 0.0]
	var oldPoint = []
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			oldPoint = points[points.length - 1]
			if (oldPoint.length > 0) {
				from[0] = oldPoint[0]
				if (oldPoint.length > 1) {
					from[1] = oldPoint[1]
				}
			}
		}
	}
	from = [getValueByDefault(from[0], fromX), getValueByDefault(from[1], fromY)]
	var isOldPoint = false
	if (oldPoint.length > 1) {
		if (from[0] == oldPoint[0] && from[1] == oldPoint[1]) {
			isOldPoint = true
		}
	}
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtractXY(to.slice(0), from)
	var fromToLength = getXYLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiplyXYByScalar(addXY(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	if (radius == undefined) {
		radius = halfFromToLength
	}
	else {
		if (Math.abs(radius) > halfFromToLength) {
			multiplyXYByScalar(fromTo, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
			var right = [fromTo[1], -fromTo[0]]
			if (isClockwise && radius > 0.0) {
				addXY(center, right)
			}
			else {
				subtractXY(center, right)
			}
			radius = Math.abs(radius)
		}
		else {
			radius = halfFromToLength
		}
	}
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * angleDifference / gDoublePi)
	var arcFromToRadius = []
	if (!isOldPoint) {
		arcFromToRadius.push(from)
	}
	var angleIncrement = angleDifference / numberOfArcSides
	var angle = fromAngle
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		angle += angleIncrement
		arcFromToRadius.push(addXY(getXYPolarByRadius(angle, radius), center))
	}
	arcFromToRadius.push(to)
	return arcFromToRadius
}

function arcTo(registry, statement, toX, toY, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	if (!variableMap.has('_points')) {
		warningByList(['In arcTo in meta the variableMap does not have _points:', toX, toY, statement])
		return [[to]]
	}
	var points = variableMap.get('_points')
	if (points.length < 2) {
		warningByList(['In arcTo in meta _points is shorter than 2:', points, toX, toY, statement])
		return [[to]]
	}
	var from = points[points.length - 1]
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var beginPoint = points[points.length - 2]
	var fromBegin = normalizeXY(getXYSubtraction(beginPoint, from))
	var rotation = [fromBegin[1], fromBegin[0]]
	var fromRotated = getXYRotation(from, rotation)
	var toRotated = getXYRotation(to, rotation)
	var midpointRotated = getXYMultiplicationByScalar(getXYAddition(fromRotated, toRotated), 0.5)
	var midpointFromRotated = normalizeXY(getXYSubtraction(fromRotated, midpointRotated))
	if (midpointFromRotated[0] == 0.0) {
		return [[to]]
	}
	var xIntercept = midpointRotated[0] + midpointFromRotated[1] * (midpointRotated[1] - fromRotated[1]) / midpointFromRotated[0]
	var center = getXYRotation([xIntercept, fromRotated[1]], [rotation[0], -rotation[1]])
	var radius = Math.abs(fromRotated[0] - xIntercept)
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	if (getXYDotProduct(fromBegin, [Math.sin(fromAngle), Math.cos(fromAngle)]) < 0.0) {
		fromAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi)
	var arcTo = []
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcTo.push(addXY(getXYPolarByRadius(fromAngle, radius), center))
	}
	arcTo.push(to)
	return arcTo
}

function arcWaveY(x, begin, end, height, phase, along) {
	var x = getValueByDefault(0.0, x)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var height = getValueByDefault(1.0, height)
	var phase = getValueByDefault(0.0, phase)
	var along = getValueByDefault(0.0, along)
	var chordLength = end - begin
	var radius = 0.5 * height + 0.125 * chordLength * chordLength / height
	var wavelength = 4.0 * radius
	var wavePortion = getPositiveModulo((x + phase / 360.0 * wavelength - (0.5 * (begin + end) - radius)) / wavelength)
	var y = radius - height * along
	if (wavePortion < 0.5) {
		var waveAway = wavePortion - 0.25
		var squareMultiplier = 1.0 - 16.0 * waveAway * waveAway
		if (squareMultiplier > 0.0) {
			return y - radius * Math.sqrt(squareMultiplier)
		}
	}
	else {
		var waveAway = wavePortion - 0.75
		var squareMultiplier = 1.0 - 16.0 * waveAway * waveAway
		if (squareMultiplier > 0.0) {
			return y + radius * Math.sqrt(squareMultiplier)
		}
	}
	return y
}

function attributeByID(registry, statement, key, id) {
	return getStatementByID(registry, statement, id).attributeMap.get(key)
}

function border(registry, statement, id) {
	return 10.0
}

function copyStatementRecursively(registry, statement, workStatement) {
	if (workStatement.nestingIncrement == 1) {
		statement.nestingIncrement = 1
		for (var child of workStatement.children) {
			addStatementRecursively(0, statement, registry, child)
		}
	}
}

function getGroupBoundingBoxByArguments(id, registry, statement) {
	statement = getStatementByID(registry, statement, id)
	return getGroupBoundingBox(statement, registry, statement)
}

function getIntervalsIncludingEnd(begin, end, increment) {//deprecated
	var difference = end - begin
	var numberUntilEnd = Math.floor((difference + gClose) / increment)
	var intervals = new Array(1 + numberUntilEnd)
	var dividedIncrement = difference / numberUntilEnd
	var total = 0.0
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		intervals[intervalIndex] = total
		total += dividedIncrement
	}
	intervals[intervals.length - 1] = end
	return intervals
}

function getPoint(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var oldPoint = points[points.length - 1]
			for (var oldIndex = 0; oldIndex < Math.min(point.length, oldPoint.length); oldIndex++) {
				if (point[oldIndex] == undefined) {
					point[oldIndex] = oldPoint[oldIndex]
				}
			}
		}
	}
	variableMap.set(name, point.toString())
	return point
}

function getPolar(length, inputAngle) {
	var angle = 0.0
	if (inputAngle != undefined) {
		angle = inputAngle * gRadiansPerDegree
	}
	return getXYPolarByRadius(angle, length)
}

function getStatementByID(registry, statement, id) {
	if (id != undefined) {
		if (id.length > 0) {
			for (var character of id) {
				if (character != '.') {
					if (registry.idMap.has(id)) {
						return registry.idMap.get(id)
					}
					break
				}
			}
			for (var character of id) {
				if (statement.parent == null) {
					return statement
				}
				statement = statement.parent
			}
		}
	}
	return statement
}

function getStringLength(word) {
	return word.length
}

function getSuffixedString(root, suffix) {
	if (suffix == null) {
		return root
	}
	return root + suffix
}

function getTransform2DsBySuffix(attributeMap, registry, statement, suffix) {
	var transform2Ds = getPointsByKey(getSuffixedString('transform2Ds', suffix), registry, statement)
	if (transform2Ds == null) {
		transform2Ds = []
	}
	var suffixedPlanes = getSuffixedString('planes', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != null) {
		for (var plane of planes) {
			transform2Ds.push(get2DTransformByPlane(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}
	var suffixedPolars = getSuffixedString('polars', suffix)
	var polars = getPointsByKey(suffixedPolars, registry, statement)
	if (polars != null) {
		for (var polar of polars) {
			transform2Ds.push(get2DTransformByPolar(polar))
		}
		attributeMap.set(suffixedPolars, polars.join(' '))
	}
	var workPoints = null
	if (suffix == null) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			workPoints = getPointsHD(registry, workStatement)
		}
	}
	var suffixedPolygon = getSuffixedString('polygon', suffix)
	var polygon = getPointsByKey(suffixedPolygon, registry, statement)
	var suffixedPolyline = getSuffixedString('polyline', suffix)
	var polyline = getPointsByKey(getSuffixedString('polyline', suffix), registry, statement)
	if (workPoints != null) {
		if (workStatement.tag == 'polygon') {
			if (polygon == null) {
				polygon = workPoints
			}
			else {
				pushArray(polygon, workPoints)
			}
		}
		else {
			if (workStatement.tag == 'polyline') {
				if (polyline == null) {
					polyline = workPoints
				}
				else {
					pushArray(polyline, workPoints)
				}
			}
		}
	}
	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!getIsEmpty(scalePortion)) {
		if (scalePortion.length == 1) {
			scalePortion.push(scalePortion[0])
		}
		attributeMap.set(suffixedScalePortion, scalePortion.join(','))
	}
	if (polygon != null) {
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % polygon.length
			transform2Ds.push(get2DTransformBySegmentPortion(polygon[pointIndex], polygon[nextIndex], scalePortion))
		}
		attributeMap.set(suffixedPolygon, polygon.join(' '))
	}
	if (polyline != null) {
		for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
			transform2Ds.push(get2DTransformBySegmentPortion(polyline[pointIndex], polyline[pointIndex + 1], scalePortion))
		}
		attributeMap.set(suffixedPolyline, polyline.join(' '))
	}
	var suffixedScale = getSuffixedString('scale', suffix)
	var scale = getFloatsByStatement(suffixedScale, registry, statement)
	if (transform2Ds.length > 0) {
		if (!getIsEmpty(scale)) {
			if (scale.length == 1) {
				scale.push(scale[0])
			}
			for (var transform2D of transform2Ds) {
				transform2D[0] *= scale[0]
				transform2D[2] *= scale[0]
				transform2D[1] *= scale[1]
				transform2D[3] *= scale[1]
			}
			attributeMap.set(suffixedScale, scale.join(','))
		}
	}
	return transform2Ds
}

function intervals(begin, end, increment, includeEnd) {
	var difference = end - begin
	var numberUntilEnd = Math.floor((difference + gClose) / increment)
	if (includeEnd == undefined) {
		includeEnd = true
	}
	var intervals = new Array((includeEnd == true) + numberUntilEnd)
	var dividedIncrement = difference / numberUntilEnd
	var total = 0.0
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		intervals[intervalIndex] = total
		total += dividedIncrement
	}
	if (includeEnd) {
		intervals[intervals.length - 1] = end
	}
	return intervals
}

function operation(registry, statement, symbol, elements, otherElements) {
	if (getIsEmpty(elements)) {
		return []
	}
	if (otherElements == null || otherElements == undefined) {
		return []
	}
	if (!Array.isArray(otherElements)) {
		otherElements = [otherElements]
	}
	if (otherElements.length == 0) {
		return []
	}
	var symbol = getValueByDefault('+', symbol)
	var monad = new VariableMonad()
	for (var character of symbol) {
		monad = monad.getNextMonad(character, registry, statement)
	}
	var previousMonad = monad.previousMonad
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		previousMonad.value = elements[elementIndex]
		elements[elementIndex] = monad.getResult(registry, statement, otherElements[elementIndex % otherElements.length])
	}
	return elements
}

function pointsByID(registry, statement, id) {
	return getPointsHD(registry, getStatementByID(registry, statement, id))
}

function rightByID(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
		return 0.0
	}
	return boundingBox[1][0]
}

function setAttributeByID(registry, statement, key, id, value) {
	return getStatementByID(registry, statement, id).attributeMap.set(key, value)
}

function sineWave(amplitude, begin, end, numberOfCycles, phase, along, numberOfSegments) {
	var amplitude = getValueByDefault(1.0, amplitude)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var phase = getValueByDefault(0.0, phase) * gRadiansPerDegree
	var along = getValueByDefault(0.0, along)
	var numberOfSegments = getValueByDefault(24, numberOfSegments)
	var sinPoints = new Array(numberOfCycles * numberOfSegments + 1)
	var wavelength = Math.abs(end - begin) / numberOfCycles
	var oneOverWavelengthSegments = wavelength / numberOfSegments
	for (var pointIndex = 0; pointIndex < sinPoints.length; pointIndex++) {
		var x = pointIndex * oneOverWavelengthSegments + begin
		sinPoints[pointIndex] = [x, amplitude * Math.sin(x * gDoublePi / wavelength + phase)]
	}
	return sinPoints
}

function sineWaveY(x, begin, end, numberOfCycles, phase, along) {
	var x = getValueByDefault(0.0, x)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var phase = getValueByDefault(0.0, phase) * gRadiansPerDegree
	var along = getValueByDefault(0.0, along)
	var wavelength = Math.abs(end - begin) / numberOfCycles
	return Math.sin((x + begin) * gDoublePi / wavelength + phase)
}

function topByID(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
		return 0.0
	}
	return boundingBox[1][1]
}

function toward(point, distance, x, y) {
	if (getIsEmpty(point)) {
		point = [0.0, 0.0]
	}
	if (point.length == 1) {
		point.push(0.0)
	}
	var distance = getValueByDefault(1.0, distance)
	var x = getValueByDefault(0.0, x)
	var y = getValueByDefault(0.0, y)
	var xyPoint = [x - point[0], y - point[1]]
	xyPointLength = getXYLength(xyPoint)
	if (xyPointLength == 0.0) {
		return point
	}
	return getXYAddition(point, multiplyXYByScalar(xyPoint, distance / xyPointLength))
}

function workMesh(registry, statement, propertyName) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return null
	}
	var work = attributeMap.get('work')
	if (work.startsWith("'") || work.startsWith('"')) {
		work = work.slice(1)
	}
	if (work.endsWith("'") || work.endsWith('"')) {
		work = work.slice(0, -1)
	}
	var workGenerator = registry.generatorMap.get(work)
	if (workGenerator == null) {
		return null
	}
	var workMesh = workGenerator.getMesh()
	if (workMesh[propertyName] == undefined) {
		return null
	}
	return workMesh[propertyName].toString()
}

var gAbstract = {
	initialize: function() {
		gTagBeginMap.set(this.name, this)
	},
	name: 'abstract',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('skip2D')) {
			attributeMap.set('skip2D', 'true')
		}
		var flipY = getFloatByStatement('flipY', registry, statement)
		if (flipY != null) {
			scaleString = 'scale(' + flipY + ',' + (-flipY) + ')'
			attributeMap.set('transform', scaleString)
		}
		var styleMap = new Map([
			['fill', 'none'],
			['stroke', 'rgb(0,0,0)'],
			['stroke-width', '1']])
		if (attributeMap.has('style')) {
			styles = attributeMap.get('style').replace(/ /g, '').split(';')
			for (var style of styles) {
				var entry = style.split(':')
				styleMap.set(entry[0], entry[1])
			}
		}
		styles = []
		for (var entry of styleMap) {
			styles.push(entry[0] + ':' + entry[1])
		}
		attributeMap.set('style', styles.join(';'))
		titleStrings = []
		gProject = null
		if (attributeMap.has('project')) {
			gProject = attributeMap.get('project')
			if (gProject != 'untitled') {
				titleStrings.push(gProject)
				registry.storageMap.set('project', gProject)
			}
		}
		gAbstractID = null
		if (attributeMap.has('id')) {
			gAbstractID = attributeMap.get('id')
			if (gAbstractID != 'untitled' && gAbstractID != gProject) {
				titleStrings.push(gAbstractID)
				registry.storageMap.set('abstractID', gAbstractID)
			}
		}
		gDate = null
		if (attributeMap.has('date')) {
			gDate = attributeMap.get('date')
			titleStrings.push(gDate)
			registry.storageMap.set('date', gDate)
		}
		gTitle = titleStrings.join('_')
		titleStrings.push('Wordscape')
		document.title = titleStrings.join(' - ')
	}
}

var gCopy = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'copy',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('work')) {
			return
		}
		var workID = attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			return
		}
		var workStatement = registry.idMap.get(workID)
		var alterationsTransformSet = new Set(gAlterationsDisplay.concat(['transform', 'transform3D']))
		copyMissingKeysExcept(alterationsTransformSet, workStatement.attributeMap, statement.attributeMap)
		if (statement.nestingIncrement == 0) {
			statement.tag = workStatement.tag
			copyStatementRecursively(registry, statement, workStatement)
			alterStatementPoints(registry, statement)
			alterChildrenRecursively(statement.children, 0, registry, statement)
			return
		}
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		if (getIsEmpty(transform2Ds)) {
			warningByList(['No matrix2Ds in gCopy', statement])
			return
		}
		var endStatement = statement.children.pop()
		for (var transform2D of transform2Ds) {
			addStatementRecursively(0, statement, registry, workStatement)
			var transformedMap = statement.children[statement.children.length - 1].attributeMap
			transformedMap.set('transform', 'matrix(' + transform2D.toString() + ')')
		}
		statement.children.push(endStatement)
	}
}

var gCSV = {
	alterMesh: function(mesh, registry, statement) {
		addCSVToMeshArea(statement.attributeMap.get('id'), mesh, registry)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'csv',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		addCSVToMeshArea(statement.attributeMap.get('work'), workMesh, registry)
	}
}

var gDelete = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'delete',
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		for (var workStatement of workStatements) {
			deleteStatement(workStatement)
		}
		deleteStatement(statement)
	}
}

var gGroup = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		gTagCenterMap.set('g', this)
	},
	name: 'group',
	processStatement: function(registry, statement) {
		get2DMatrix(registry, statement)
	}
}

var gMatrix2D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		//deprecated
		gTagCenterMap.set('derive2D', this)
	},
	name: 'matrix2D',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var transform2Ds = getTransform2DsBySuffix(attributeMap, registry, statement, null)
		if (transform2Ds.length == 0) {
			return
		}
		for (var depth = 1; depth < gRecursionLimit; depth++) {
			var depthTransform2Ds = getTransform2DsBySuffix(attributeMap, registry, statement, '_' + depth.toString())
			if (depthTransform2Ds.length == 0) {
				break
			}
			else {
				var count = 0
				var newTransform2Ds = new Array(depthTransform2Ds.length * transform2Ds.length)
				for (var depthTransform2D of depthTransform2Ds) {
					for (var transform2D of transform2Ds) {
						newTransform2Ds[count] = getMultiplied2DMatrix(depthTransform2D, transform2D)
						count++
					}
				}
				transform2Ds = newTransform2Ds
			}
		}
		attributeMap.set('matrix2Ds', transform2Ds.join(' '))

		//deprecated
		attributeMap.set('transform2Ds', transform2Ds.join(' '))
	}
}

var gPolygonAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == null) {
			return
		}
		var analysisStatement = getStatement('polygonAnalysis')
		analysisStatement.attributeMap = getMeshAnalysis(mesh)
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_polygonAnalysis')
		analysisStatement.parent = statement
		statement.children.splice(-1, 0, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			statement.attributeMap = getMeshAnalysis(workMesh)
		}
	}
}

var gRow = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'row',
	processStatement: function(registry, statement) {
		if (!statement.attributeMap.has('cells')) {
			return
		}
		var cellStrings = statement.attributeMap.get('cells').split(' ').filter(lengthCheck)
		for (var cellString of cellStrings) {
			var cells = cellString.split(',').filter(lengthCheck)
			if (cells.length > 0) {
				var groupStatement = statement
				if (cells.length > 1) {
					groupStatement = getStatement('g {')
					groupStatement.parent = statement
					getStatementID(registry, groupStatement)
					statement.children.push(groupStatement)
				}
				for (var cell of cells) {
					if (registry.idMap.has(cell)) {
						var workStatement = registry.idMap.get(cell)
						var child = getStatement(workStatement.tag)
						child.parent = groupStatement
						getStatementID(registry, child)
						groupStatement.children.push(child)
						copyMissingKeysExcept(gAlterationsSet, workStatement.attributeMap, child.attributeMap)
						copyStatementRecursively(registry, child, workStatement)
					}
				}
				if (cells.length > 1) {
					addClosingStatement(groupStatement)
				}
			}
		}
		addClosingStatementConvertToGroup(statement)
	}
}

var gSTL = {
	alterMesh: function(mesh, registry, statement) {
		addSTLToMeshArea(statement.attributeMap.get('id'), mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'stl',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		addSTLToMeshArea(statement.attributeMap.get('work'), workMesh)
	}
}

var gString = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'string',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				variableMap.set(key, attributeMap.get(key))
			}
		}
	}
}

var gTable = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'table',
	processStatement: function(registry, statement) {
		var step = getFloatsByDefault([10.0], 'step', registry, statement, this.name)
		if (step.length == 1) {
			step.push(step[0])
		}
		var add3DTransform = getBooleanByDefault(false, '3D', registry, statement, this.name)
		var translate = [0.0, 0.0]
		for (var child of statement.children) {
			if (child.nestingIncrement == 1) {
				for (var grandchild of child.children) {
					if (grandchild.nestingIncrement > -1) {
						var attributeMap = grandchild.attributeMap
						var translateString = 'translate(' + translate.toString() + ')'
						var totalString = translateString
						if (attributeMap.has('transform')) {
							totalString += ',' + attributeMap.get('transform')
						}
						attributeMap.set('transform', totalString)
						if (add3DTransform) {
							totalString = translateString
							if (attributeMap.has('transform3D')) {
								totalString += ',' + attributeMap.get('transform3D')
							}
							attributeMap.set('transform3D', totalString)
						}
						translate[0] += step[0]
					}
				}
			}
			translate[0] = 0.0
			translate[1] += step[1]
		}
	}
}

var gTriangleAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		var analysisStatement = getStatement('triangleAnalysis')
		analysisStatement.attributeMap = getMeshAnalysis(getTriangleMesh(mesh))
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_triangleAnalysis')
		analysisStatement.parent = statement
		statement.children.splice(-1, 0, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangleAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			statement.attributeMap = getMeshAnalysis(getTriangleMesh(mesh))
		}
	}
}

/*
var gURL = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'url',
	processStatement: function(registry, statement) {
		gURLMaximumLength = getIntByDefault(gURLMaximumLength, 'maximumLength', registry, statement, this.name)
	}
}
*/

var gVar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		var polylineMapEntries = []
		addFunctionToEntriesByName(arcWaveY, polylineMapEntries, 'arcWaveY', null)
		addFunctionToEntriesByName(operation, polylineMapEntries, 'operation', gSetRS)
		addFunctionToEntriesByName(pointsByID, polylineMapEntries, 'pointsByID', gSetRS)
		addFunctionToEntriesByName(sineWave, polylineMapEntries, 'sineWave', null)
		addFunctionToEntriesByName(sineWaveY, polylineMapEntries, 'sineWaveY', null)
		addFunctionToVariableEntries(arcFromToAngle, gSetR)
		addFunctionToVariableEntries(arcFromToCenter, null)
		addFunctionToVariableEntries(arcFromToRadius, gSetR)
		addFunctionToVariableEntries(arcTo, gSetR)
		addFunctionToVariableEntries(attributeByID, gSetRS)
		addFunctionToVariableEntries(border, gSetRS)

		addFunctionToVariableEntries(getIntervalsIncludingEnd, null)//deprecated23

		addFunctionToEntriesByName(getPoint, gVariableMapEntries, 'point', gSetRS)
		addFunctionToEntriesByName(getPolar, gVariableMapEntries, 'polar', null)
		addFunctionToVariableEntries(intervals, null)
		addFunctionToVariableEntries(rightByID, gSetRS)
		addFunctionToVariableEntries(getStringLength, gSetS)
		addFunctionToVariableEntries(setAttributeByID, gSetRS)
		addFunctionToVariableEntries(topByID, gSetRS)
		addFunctionToVariableEntries(toward, null)
		addFunctionToVariableEntries(workMesh, gSetRS)
		gVariableMapEntries.push(['Array', addVariableObjectToEntries(new Map(), Array)])
		gVariableMapEntries.push(['Date', addVariableObjectToEntries(new Map(), Date)])
		gVariableMapEntries.push(['Math', addVariableObjectToEntries(new Map(), Math)])
		gVariableMapEntries.push(['Number', addVariableObjectToEntries(new Map(), Number)])
		gVariableMapEntries.push(['Poly', new Map(polylineMapEntries)])

		//deprecated23
		gVariableMapEntries.push(['Polyline', new Map(polylineMapEntries)])

		gVariableMapEntries.push(['String', addVariableObjectToEntries(new Map(), String)])
	},
	name: 'var',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				var variableString = attributeMap.get(key)
				if (isNaN(variableString)) {
					variableString = getString(getValueByEquation(registry, statement, variableString))
					attributeMap.set(key, variableString)
				}
				variableMap.set(key, variableString)
			}
		}
	}
}

var gView = {
	alterMesh: function(mesh, registry, statement) {
		meshViewer.addMesh(statement.attributeMap.get('id'), null)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'view',
	processStatement: function(registry, statement) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			this.alterMesh(null, registry, workStatement)
		}
	}
}

var gWindow = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'window',
	processStatement: function(registry, statement) {
		if (!statement.attributeMap.has('skip2D')) {
			statement.attributeMap.set('skip2D', 'true')
		}
		get2DMatrix(registry, statement)
	}
}

var gMetaProcessors = [
	gAbstract,
	gCopy,
	gCSV,
	gDelete,
	gGroup,
	gMatrix2D,
	gPolygonAnalysis,
	gRow,
	gSTL,
	gString,
	gTable,
	gTriangleAnalysis,
//	gURL,
	gVar,
	gView,
	gWindow]
