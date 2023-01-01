//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function additionInterpolation(x, polyline, arrayLength) {
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	var point = new Array(arrayLength).fill(0.0)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		point[dimensionIndex % arrayLength] = oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
	}
	return point
}

function additionInterpolation2D(x, polyline) {
	return additionInterpolation(x, polyline, 2)
}

function additionInterpolation3D(x, polyline) {
	return additionInterpolation(x, polyline, 3)
}

function alongsFromToDistance(from, to, fromDistances, toDistances) {
	fromDistances = getValueByDefault([], fromDistances)
	fromDistances = getArrayByValue(fromDistances)
	toDistances = getValueByDefault([], toDistances)
	toDistances = getArrayByValue(toDistances)
	var alongs = new Array(fromDistances.length + toDistances.length)
	from = getValueByDefault([0.0, 0.0], from)
	from = getArrayByValue(from)
	to = getValueByDefault([10.0, 0.0], to)
	to = getArrayByValue(to)
	var oneOverDistance = 1.0 / distanceArray(from, to)
	var arrayIndex = 0
	for (var fromIndex = 0; fromIndex < fromDistances.length; fromIndex++) {
		alongs[arrayIndex++] = oneOverDistance * fromDistances[fromIndex]
	}
	for (var toIndex = 0; toIndex < toDistances.length; toIndex++) {
		alongs[arrayIndex++] = 1.0 + oneOverDistance * toDistances[toIndex]
	}
	return alongs
}

function arcBeforeFromTo(
registry, statement, beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo) {
	return spiralBeforeFromTo(
	registry, statement, [beforeX, beforeY], [fromX, fromY], [toX, toY], numberOfSides, includeBefore, includeFrom, includeTo)
}

function arcCenterRadius(centerX, centerY, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo) {
	return spiralCenterRadius([centerX, centerY], radius, fromAngle, toAngle, undefined, numberOfSides, includeFrom, includeTo)
}

function arcFromToAngle(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo) {
	return spiralFromToAngle(registry, statement, [fromX, fromY], [toX, toY], angle, numberOfSides, includeFrom, includeTo)
}

function arcFromToRadius(registry, statement, fromX, fromY, toX, toY, radius, counterclockwise, numberOfSides, includeFrom, includeTo) {
	return spiralFromToRadius(
	registry, statement, [fromX, fromY], [toX, toY], radius, counterclockwise, numberOfSides, includeFrom, includeTo)
}

function arcTo(registry, statement, toX, toY, numberOfSides, includeTo) {
	return spiralBeforeFromTo(
	registry, statement, [undefined, undefined], [undefined, undefined], [toX, toY], numberOfSides, false, false, includeTo)
}

function arcToAngle(registry, statement, toX, toY, angle, numberOfSides, includeTo) {
	return spiralFromToAngle(registry, statement, [undefined, undefined], [toX, toY], angle, numberOfSides, false, includeTo)
}

function arcToRadius(registry, statement, toX, toY, radius, counterclockwise, numberOfSides, includeTo) {
	return spiralFromToRadius(
	registry, statement, [undefined, undefined], [toX, toY], radius, counterclockwise, numberOfSides, false, includeTo)
}

function arcWaveXFromToHeight(xs, from, to, height, phase, along) {
	var from = getValueByDefault(0.0, from)
	var to = getValueByDefault(4.0, to)
	var xs = getValueByDefault(intervalsFromToIncrement(from, to, 0.5), xs)
	var arcs = new Array(xs.length)
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		arcs[xIndex] = [xs[xIndex], arcYXFromToHeight(xs[xIndex], from, to, height, phase, along)]
	}
	return arcs
}

function arcYXFromToHeight(x, from, to, height, phase, along) {
	var x = getValueByDefault(0.0, x)
	var from = getValueByDefault(0.0, from)
	var to = getValueByDefault(4.0, to)
	var height = getValueByDefault(1.0, height)
	var phase = getValueByDefault(0.0, phase)
	var wavelength = to - from
	var chordLength = 0.5 * wavelength
	var radius = 0.5 * height + 0.125 * chordLength * chordLength / height
	var wavePortion = getPositiveModulo(phase / 360.0 + (x -from) / wavelength)
	var y = radius - height
	if (wavePortion < 0.5) {
		var absoluteAway = (wavePortion - 0.25) * wavelength
		var squareMultiplier = radius * radius - absoluteAway * absoluteAway
		if (squareMultiplier > 0.0) {
			return Math.sqrt(squareMultiplier) - y
		}
	}
	else {
		var absoluteAway = (wavePortion - 0.75) * wavelength
		var squareMultiplier = radius * radius - absoluteAway * absoluteAway
		if (squareMultiplier > 0.0) {
			return y - Math.sqrt(squareMultiplier)
		}
	}
	return 0.0
}

function attributeByIDKey(registry, statement, id, key) {
	return getStatementByID(registry, statement, id).attributeMap.get(key)
}

function border(registry, statement, id) {
	return 10.0
}

function bracket(center, side) {
	center = getValueByDefault(0.0, center)
	side = getValueByDefault(1.0, side)
	return [center - side, center + side]
}

function ellipseFromToRadius(registry, statement, from, to, radius, numberOfSides, includeFrom, includeTo) {
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	from = getArrayByValue(from)
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	var center = getMidpoint2D(from, to)
	var centerFrom = getSubtraction2D(from, center)
	var centerFromLength = length2D(centerFrom)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var radius = getValueByDefault(1.0, radius)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var arc = []
	if (includeFrom) {
		arc.push(from)
	}
	if (centerFromLength == 0.0) {
		return arc
	}
	var right = divide2DScalar([centerFrom[1], -centerFrom[0]], centerFromLength * Math.sqrt(centerFromLength))
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(Math.PI) / gDoublePi)
	var zAddition = null
	if (from.length > 2) {
		zAddition = (to[2] - from[2]) / numberOfArcSides
		center.push(0.0)
		centerFrom.push(from[2])
	}
	var rotator = polarCounterclockwise(Math.PI / numberOfArcSides)
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var vertexIndex = 0; vertexIndex < numberOfArcSides; vertexIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		var point = getAdditionArray(center, centerFrom, 3)
		add2D(point, getMultiplication2DScalar(right, dotProduct2D(right, centerFrom) * (radius - centerFromLength)))
		arc[arrayIndex++] = point
	}
	if (includeTo) {
		arc.push(to)
	}
	return arc
}

function ellipseToRadius(registry, statement, to, radius, numberOfSides, includeFrom, includeTo) {
	return ellipseFromToRadius(registry, statement, [undefined, undefined], to, radius, numberOfSides, false, includeTo)
}

function fillet(registry, statement, pointX, pointY, radius, numberOfSides, checkLength) {
	return filletPoint(registry, statement, [pointX, pointY], radius, numberOfSides, checkLength)
}

function filletPoint(registry, statement, point, radius, numberOfSides, checkLength) {
	checkLength = getValueByDefault(true, checkLength)
	numberOfSides = getValueByDefault(gFillet.sides, numberOfSides)
	radius = getValueByDefault(1.0, radius)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(point, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(point, 0.0)
	if (variableMap.has('_values')) {
		var values = variableMap.get('_values')
		values.push('filletTaggedPoints(' + point[0] + ',' + point[1] + ',' + radius + ',' + numberOfSides + ',' + checkLength + ')')
	}
	else {
		noticeByList(['No values could be found for fillet in function.', statement])
	}
	return [point]
}

function filletTaggedPoints(registry, statement, pointX, pointY, radius, numberOfSides, checkLength) {
	var variableMap = getVariableMapByStatement(statement.parent)
	if (!variableMap.has('_points')) {
		noticeByList(['No points could be found for fillet in function.', statement])
		return [[]]
	}
	var points = variableMap.get('_points')
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		if (point.length > 1) {
			if (point[0] - pointX == 0.0 && point[1] - pointY == 0.0) {
				var afterPoint = null
				var beforePoint = null
				if (checkLength) {
					beforePoint = points[(pointIndex - 2 + points.length) % points.length]
					afterPoint = points[(pointIndex + 2) % points.length]
				}
				var beginPoint = points[(pointIndex - 1 + points.length) % points.length]
				var endPoint = points[(pointIndex + 1) % points.length]
				var remainingPoints = points.slice(pointIndex + 1)
				points.length = pointIndex
				addFilletedPointsByQuintuple(
				beforePoint, beginPoint, point, endPoint, afterPoint, points, gDoublePi / numberOfSides, numberOfSides, radius)
				pushArray(points, remainingPoints)
				return [points.pop()]
			}
		}
	}
	return [[]]
}

//deprecated23
function floatByKeyID(registry, statement, key, id) {
	return floatByIDKey(registry, statement, id, key)
}

function floatByIDKey(registry, statement, id, key) {
	return parseFloat(getStatementByID(registry, statement, id).attributeMap.get(key))
}

function getParabolicFrom(from, fromTo, levelStart, x, xMultiplier, zAddition) {
	from = from.slice(0)
	from[0] += x
	if (levelStart) {
		from[1] += x * x * xMultiplier
	}
	else {
		x = fromTo[0] - x
		x *= x * xMultiplier
		from[1] += fromTo[1] - x
	}
	if (zAddition != null) {
		from[2] += zAddition * x
	}
	return from
}

function insetsHeightAngle(height, overhangAngle, numberOfSegments) {
	height = getValueByDefault(4.0, height)
	numberOfSegments = Math.max(getValueByDefault(4, numberOfSegments), 1)
	overhangAngle = getValueByDefault(45.0, overhangAngle) * gRadiansPerDegree
	var insets = new Array(numberOfSegments + 1)
	var radius = height / Math.sin(overhangAngle)
	var radiusSquared = radius * radius
	for (var insetIndex = 0; insetIndex < insets.length; insetIndex++) {
		var y = insetIndex * height / numberOfSegments
		var down = height - y
		insets[insetIndex] = [radius - Math.sqrt(radiusSquared - down * down), y]
	}
	var xMultiplier = (insets[1][1] - insets[0][1]) * Math.tan(overhangAngle) / (insets[0][0] - insets[1][0])
	for (var inset of insets) {
		inset[0] *= xMultiplier
	}
	return insets
}

function intervalFromToBetween(from, to, along) {
	return intervalsFromToBetween(from, to, along)[0]
}

function intervalsFromQuantityIncrement(from, quantity, increments, includeFrom) {
	from = getValueByDefault(0.0, from)
	includeFrom = getValueByDefault(true, includeFrom)
	increments = getValueByDefault(1.0, increments)
	increments = getArrayByValue(increments)
	quantity = getValueByDefault(11, quantity)
	if (quantity == 0.0) {
		noticeByList(['quantity is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}
	if (quantity < 0.0) {
		for (var incrementIndex = 0; incrementIndex < increments.length; incrementIndex++) {
			increments[incrementIndex] = -increments[incrementIndex]
		}
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
		quantityFloor -= 1
	}
	if (properFraction > gClose) {
		quantityFloor += 1
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	var increment = 0
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		from += increment
		intervals[arrayIndex++] = from
	}
	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}
	return intervals
}

function intervalsFromToAlong(from, to, alongs, includeFrom, includeTo) {
	alongs = getValueByDefault(0.5, alongs)
	alongs = getArrayByValue(alongs)
	from = getValueByDefault(0.0, from)
	to = getValueByDefault(10.0, to)
	var difference = to - from
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + alongs.length
	for (var intervalIndex = 0; intervalIndex < alongs.length; intervalIndex++) {
		intervals[arrayIndex++] = from + alongs[intervalIndex] * difference
	}
	if (includeTo) {
		intervals.push(to)
	}
	return intervals
}

function intervalsFromToBetween(from, to, alongs) {
	return intervalsFromToAlong(from, to, alongs, false, false)
}

function intervalsFromToIncrement(from, to, increments, includeFrom, includeTo) {
	from = getValueByDefault(0.0, from)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	increments = getValueByDefault(1.0, increments)
	increments = getArrayByValue(increments)
	var totalLength = 0.0
	for (var increment of increments) {
		totalLength += increment
	}
	to = getValueByDefault(10.0, to)
	var difference = to - from
	var numberUntilEnd = Math.floor((Math.abs(difference) + gClose) / Math.abs(totalLength))
	if (numberUntilEnd == 0) {
		noticeByList(['numberUntilEnd is 0 in intervalsFromToIncrement in function.', from, to, increments])
		return [from]
	}
	if (totalLength == 0.0) {
		noticeByList(['totalLength is 0 in intervalsFromToIncrement in function.', from, to, increments])
		return [from]
	}
	var incrementMultiplier = difference / numberUntilEnd / totalLength
	for (var incrementIndex = 0; incrementIndex < increments.length; incrementIndex++) {
		increments[incrementIndex] *= incrementMultiplier
	}
	numberUntilEnd -= 1
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + numberUntilEnd
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		for (var increment of increments) {
			from += increment
			intervals[arrayIndex++] = from
		}
	}
	if (includeTo) {
		intervals.push(to)
	}
	return intervals
}

function intervalsFromToQuantity(from, to, quantity, includeFrom, includeTo) {
	from = getValueByDefault(0.0, from)
	to = getValueByDefault(10.0, to)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	quantity = getValueByDefault(11, quantity)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
		quantityFloor -= 1
	}
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}
	if (!includeTo) {
		quantity += 1.0
	}
	var increment = (to - from) * one / quantity
	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		from += increment
		intervals[arrayIndex++] = from
	}
	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}
	return intervals
}

function joinPoints(registry, statement, sourcePoints, numberOfJoins, from, until) {
	numberOfJoins = getValueByDefault(1, numberOfJoins)
	if (numberOfJoins < 1) {
		return []
	}
	if (getIsEmpty(sourcePoints)) {
		return []
	}
	until = getValueByDefault(3, until)
	from = getArrayByValue(from)
	from.length = until
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var lastPoint = points[points.length - 1]
			from.length = lastPoint.length
			setUndefinedElementsToArray(from, lastPoint)
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	var joinedPoints = []
	for (var joinCount = 0; joinCount < numberOfJoins; joinCount++) {
		pushArray(joinedPoints, addArrays(getArraysCopy(sourcePoints), from, until))
		from = joinedPoints[joinedPoints.length - 1]
	}
	return joinedPoints
}

//deprecated23
function mirror(registry, statement, center, direction) {
	return mirrorJoin(registry, statement, center, direction)
}

function mirrorJoin(registry, statement, center, direction) {
	var variableMap = getVariableMapByStatement(statement.parent)
	if (!variableMap.has('_points')) {
		noticeByList(['In mirror in function the variableMap does not have _points:', statement])
		return [[]]
	}
	var points = variableMap.get('_points')
	if (points.length < 2) {
		noticeByList(['In mirror in function _points is shorter than 2:', points, toX, toY, statement])
		return [[]]
	}
	if (direction != undefined) {
		direction = getArrayByValue(direction)
	}
	var centerDirection = getCenterDirectionByCenterDirection(center, direction)
	var mirrorStart = points.length - 1
	if (centerDirection == null) {
		var centerDirection = getCenterDirectionMirrorStart(mirrorStart, points)
		mirrorStart = centerDirection.mirrorStart
	}
	addMirrorPoints(centerDirection, mirrorStart, points)
	// must return something, which will be added to the points, so the last point is popped
	return [points.pop()]
}

function operation(registry, statement, symbol, elements, otherElements) {
	if (getIsEmpty(elements)) {
		return []
	}
	if (otherElements == null || otherElements == undefined) {
		return []
	}
	otherElements = getArrayByValue(otherElements)
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

function parabolaFromToQuantity(registry, statement, from, to, quantity, levelStart, horizontal, includeFrom, includeTo) {
	to = getValueByDefault([10.0, 10.0], to)
	to = getArrayByValue(to)
	from = getArrayByValue(from)
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var levelStart = getValueByDefault(true, levelStart)
	horizontal = getValueByDefault(true, horizontal)
	from = from.slice(0)
	if (!horizontal) {
		swapXYPoint(from)
		to = to.slice(0)
		swapXYPoint(to)
	}
	var fromTo = getSubtractionArray(to, from, 3)
	if (fromTo[0] == 0.0) {
		noticeByList(['fromTo[0] is 0 in parabolaFromTo in function.', from, to, radius])
		return arc
	}
	var quantity = getValueByDefault(11, quantity)
	if (quantity < 0.0) {
		fromTo[0] = -fromTo[0]
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in parabolaFromTo in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	var parabola = []
	if (includeFrom) {
		parabola.push(from)
		quantityFloor--
	}
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}
	if (!includeTo) {
		quantity += 1.0
	}
	var arrayIndex = parabola.length
	parabola.length = parabola.length + quantityFloor
	var xMultiplier = fromTo[1] / fromTo[0] / fromTo[0]
	var incrementX = fromTo[0] / quantity
	var x = incrementX
	var zAddition = null
	if (from.length > 2) {
		zAddition = fromTo[2] / fromTo[0]
	}
	for (var count = 0; count < quantityFloor; count++) {
		parabola[arrayIndex++] = getParabolicFrom(from, fromTo, levelStart, x, xMultiplier, zAddition)
		x += incrementX
	}
	if (properFraction > gClose) {
		x = parabola[parabola.length - 2][0] + properFraction * incrementX
		parabola[parabola.length - 1] = getParabolicFrom(from, fromTo, levelStart, x, xMultiplier, zAddition)
	}
	if (!horizontal) {
		swapXYPolygon(parabola)
	}
	return parabola
}

function parabolaToQuantity(registry, statement, to, quantity, levelStart, horizontal, includeFrom, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return parabolaFromToQuantity(registry, statement, new Array(fromLength), to, quantity, levelStart, horizontal, false, includeTo)
}

function point(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(point, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(point, 0.0)
	variableMap.set(name, point.toString())
	return point
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

function sineWaveXFromToCycles(xs, from, to, numberOfCycles, phase, numberOfSegments) {
	var from = getValueByDefault(0.0, from)
	var to = getValueByDefault(4.0, to)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var xs = getValueByDefault(intervalsFromToIncrement(from, to, 0.5 / numberOfCycles), xs)
	var numberOfSegments = getValueByDefault(24, numberOfSegments)
	var sinPoints = new Array(numberOfCycles * numberOfSegments + 1)
	var wavelength = Math.abs(to - from) / numberOfCycles
	var oneOverWavelengthSegments = wavelength / numberOfSegments
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		sinPoints[xIndex] = [xs[xIndex], sineYXFromToCycles(xs[xIndex], from, to, numberOfCycles, phase)]
	}
	return sinPoints
}

function sineYXFromToCycles(x, from, to, numberOfCycles, phase) {
	var x = getValueByDefault(0.0, x)
	var from = getValueByDefault(0.0, from)
	var to = getValueByDefault(4.0, to)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var phase = getValueByDefault(0.0, phase) * gRadiansPerDegree
	var wavelength = Math.abs(to - from) / numberOfCycles
	return Math.sin((x + from) * gDoublePi / wavelength + phase)
}

function spiralBeforeFromTo(registry, statement, before, from, to, numberOfSides, includeBefore, includeFrom, includeTo) {
	before = getArrayByValue(before)
	before.length = 2
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	from = getArrayByValue(from)
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 1) {
			setUndefinedElementsToArray(before, points[points.length - 2])
		}
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	before = [getValueByDefault(-10.0, before[0]), getValueByDefault(0.0, before[1])]
	setUndefinedElementsToValue(from, 0.0)
	to.length = from.length
	to[0] = getValueByDefault(10.0, to[0])
	setUndefinedElementsToValue(to, 0.0)
	includeBefore = getValueByDefault(true, includeBefore)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var beforeFrom = subtract2D(from.slice(0), before)
	var beforeFromLength = length2D(beforeFrom)
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeBefore) {
		arc.push(before)
	}
	if (beforeFromLength == 0.0 || fromToLength == 0.0) {
		return arc
	}
	divide2DScalar(beforeFrom, beforeFromLength)
	divide2DScalar(fromTo, fromToLength)
	var angle = 4.0 * Math.asin(0.5 * distance2D(beforeFrom, fromTo)) * gDegreesPerRadian
	if (crossProduct2D(beforeFrom, fromTo) < 0.0) {
		angle = -angle
	}
	pushArray(arc, spiralFromToAngle(registry, statement, from, to, angle, numberOfSides, includeFrom, includeTo))
	return arc
}

function spiralCenterRadius(center, radius, fromAngle, toAngle, toZ, numberOfSides, includeFrom, includeTo) {
	center = getArrayByElements(center, 2)
	radius = getValueByDefault(10.0, radius)
	fromAngle = getValueByDefault(0.0, fromAngle) * gRadiansPerDegree
	toAngle = getValueByDefault(360.0, toAngle) * gRadiansPerDegree
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi)
	var rotator = polarCounterclockwise(angleDifference / numberOfArcSides)
	var centerFrom = polarRadius(fromAngle, radius)
	var zAddition = null
	if (center.length > 2) {
		zAddition = (getValueByDefault(0.0, toZ) - center[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	if (!includeFrom) {
		numberOfArcSides--
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
	}
	numberOfArcSides += 1 * includeTo
	var arc = new Array(numberOfArcSides)
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		arc[pointIndex] = getAdditionArray(center, centerFrom)
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
	}
	return arc
}

function spiralFromToAngle(registry, statement, from, to, angle, numberOfSides, includeFrom, includeTo) {
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	from = getArrayByValue(from)
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeFrom) {
		arc.push(from)
	}
	if (fromToLength == 0.0) {
		return arc
	}
	var center = multiply2DScalar(add2D(from.slice(0), to), 0.5)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	var radius = halfFromToLength
	if (angle == undefined) {
		angle = Math.PI
	}
	else {
		angle *= gRadiansPerDegree
		if (Math.abs(angle) < gClose) {
			return [from, to]
		}
		var perpendicularAngle = 0.5 * Math.PI - Math.abs(0.5 * angle)
		if (angle < 0.0) {
			perpendicularAngle = -perpendicularAngle
		}
		var right = [-fromTo[1], fromTo[0]]
		add2D(center, multiply2DScalar(right, 0.5 * Math.tan(perpendicularAngle)))
		radius = Math.sqrt(halfFromToLength * halfFromToLength + lengthSquared2D(right))
	}
	var centerFrom = getSubtraction2D(from, center)
	var centerFromLength = length2D(centerFrom)
	multiply2DScalar(centerFrom, radius / centerFromLength)
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angle) / gDoublePi)
	var zAddition = null
	if (from.length > 2) {
		zAddition = (to[2] - from[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	var rotator = polarCounterclockwise(angle / numberOfArcSides)
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		arc[arrayIndex++] = getAdditionArray(center, centerFrom)
	}
	if (includeTo) {
		arc.push(to)
	}
	return arc
}

function spiralFromToRadius(registry, statement, from, to, radius, counterclockwise, numberOfSides, includeFrom, includeTo) {
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	from = getArrayByValue(from)
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var counterclockwise = getValueByDefault(true, counterclockwise)
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeFrom) {
		arc.push(from)
	}
	if (fromToLength == 0.0) {
		noticeByList(['fromToLength is 0 in spiralFromToRadius in function.', from, to, radius])
		return arc
	}
	var center = multiply2DScalar(add2D(from.slice(0), to), 0.5)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	radius = getValueByDefault(halfFromToLength, radius)
	if (Math.abs(radius) < halfFromToLength) {
		return arc
	}
	var right = [fromTo[1], -fromTo[0]]
	if (counterclockwise != radius > 0.0) {
		fromToLength = -fromToLength
	}
	multiply2DScalar(right, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
	add2D(center, right)
	var centerFrom = normalize2D(getSubtraction2D(from, center))
	var centerTo = normalize2D(getSubtraction2D(to, center))
	var angle = 2.0 * Math.asin(0.5 * distance2D(centerFrom, centerTo))
	if (radius < 0.0) {
		angle = gDoublePi - angle
	}
	var numberOfArcSides = Math.ceil(numberOfSides * angle / gDoublePi)
	if (counterclockwise) {
		angle = -angle
	}
	var zAddition = null
	if (from.length > 2) {
		zAddition = (to[2] - from[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	var rotator = polarCounterclockwise(angle / numberOfArcSides)
	multiply2DScalar(centerFrom, Math.abs(radius))
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2DVector(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
		arc[arrayIndex++] = getAdditionArray(center, centerFrom)
	}
	if (includeTo) {
		arc.push(to)
	}
	return arc
}

function spiralTo(registry, statement, to, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return spiralBeforeFromTo(
	registry, statement, new Array(fromLength), new Array(fromLength), to, numberOfSides, false, false, includeTo)
}

function spiralToAngle(registry, statement, to, angle, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return spiralFromToAngle(registry, statement, new Array(fromLength), to, angle, numberOfSides, false, includeTo)
}

function spiralToRadius(registry, statement, to, radius, counterclockwise, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return spiralFromToRadius(registry, statement, new Array(fromLength), to, radius, counterclockwise, numberOfSides, false, includeTo)
}

function stepFromToBetween(registry, statement, from, to, along) {
	return stepsFromToBetween(registry, statement, from, to, along)[0]
}

function stepsFromQuantityIncrement(registry, statement, from, quantity, increments, includeFrom) {
	from = getArrayByValue(from)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	includeFrom = getValueByDefault(true, includeFrom)
	increments = getValueByDefault([1.0, 0.0], increments)
	increments = getArrayByValue(increments)
	quantity = getValueByDefault(11, quantity)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}
	if (getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}
	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}
	if (quantity < 0.0) {
		for (var parameters of increments) {
			for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
				parameters[parameterIndex] = -parameters[parameterIndex]
			}
		}
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	from = from.slice(0)
	var steps = []
	if (includeFrom) {
		steps.push(from.slice(0))
		quantityFloor--
	}
	if (properFraction > gClose) {
		quantityFloor += 1
	}
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	var increment = []
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		addArray(from, increment)
		steps[arrayIndex++] = from.slice(0)
	}
	if (properFraction > gClose) {
		steps[steps.length - 1] = addArray(steps[steps.length - 2].slice(0), multiplyArrayScalar(increment, properFraction))
	}
	return steps
}

function stepsFromToAlong(registry, statement, from, to, alongs, includeFrom, includeTo) {
	alongs = getValueByDefault(0.5, alongs)
	alongs = getArrayByValue(alongs)
	from = getArrayByValue(from)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	var difference = getSubtractionArray(to, from)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var steps = []
	if (includeFrom) {
		steps.push(from)
	}
	var arrayIndex = steps.length
	steps.length = steps.length + alongs.length
	for (var stepIndex = 0; stepIndex < alongs.length; stepIndex++) {
		steps[arrayIndex++] = addArray(multiplyArrayScalar(difference.slice(0), alongs[stepIndex]), from)
	}
	if (includeTo) {
		steps.push(to)
	}
	return steps
}

function stepsFromToBetween(registry, statement, from, to, alongs) {
	return stepsFromToAlong(registry, statement, from, to, alongs, false, false)
}

function stepsFromToQuantity(registry, statement, from, to, quantity, includeFrom, includeTo) {
	from = getArrayByValue(from)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to = getValueByDefault(10.0, to)
	to = getArrayByValue(to)
	to.length = from.length
	setUndefinedElementsToValue(to, 0.0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	quantity = getValueByDefault(11, quantity)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}
	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var properFraction = quantity - quantityFloor
	from = from.slice(0)
	var steps = []
	if (includeFrom) {
		steps.push(from.slice(0))
		quantityFloor--
	}
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}
	if (!includeTo) {
		quantity += 1.0
	}
	var increment = multiplyArrayScalar(getSubtractionArray(to, from), one / quantity)
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		addArray(from, increment)
		steps[arrayIndex++] = from.slice(0)
	}
	if (properFraction > gClose) {
		steps[steps.length - 1] = addArray(steps[steps.length - 2].slice(0), multiplyArrayScalar(increment, properFraction))
	}
	return steps
}

function stepsQuantityIncrement(registry, statement, quantity, increments) {
	increments = getValueByDefault([1.0, 0.0], increments)
	increments = getArrayByValue(increments)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	if (getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}
	var from = new Array(increments[0].length)
	return stepsFromQuantityIncrement(registry, statement, from, getValueByDefault(10, quantity), increments, false)
}

function stepsToAlong(registry, statement, to, alongs, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return stepsFromToAlong(registry, statement, new Array(fromLength), to, alongs, false, includeTo)
}

function stepsToBetween(registry, statement, to, alongs) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return stepsFromToBetween(registry, statement, new Array(fromLength), to, alongs)
}

function stepsToQuantity(registry, statement, to, quantity, includeFrom, includeTo) {
	var fromLength = 2
	if (Array.isArray(to)) {
		fromLength = to.length
	}
	return stepsFromToQuantity(registry, statement, new Array(fromLength), to, quantity, false, includeTo)
}

function stepToBetween(registry, statement, to, along) {
	return stepsToBetween(registry, statement, to, along)[0]
}

function stringLength(word) {
	return word.length
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
	xyPointLength = length2D(xyPoint)
	if (xyPointLength == 0.0) {
		return point
	}
	return getAddition2D(point, multiply2DScalar(xyPoint, distance / xyPointLength))
}

function zigzag(polyline, radiusMultiplier, numberOfSides) {
	if (polyline.length < 3) {
		return polyline
	}
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var radiusMultiplier = getValueByDefault(0.2, radiusMultiplier)
	var centerIntersections = new Array(polyline.length)
	centerIntersections[0] = {intersection:polyline[0]}
	centerIntersections[polyline.length - 1] = {intersection:polyline[polyline.length - 1]}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		var intersection = getMultiplication2DScalar(centerBegin, 0.5)
		add2D(intersection, centerPoint)
		divide2DScalar(centerBegin, centerBeginLength)
		divide2DScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = getAddition2D(centerIntersection.centerBegin, centerIntersection.centerEnd)
		normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, distance2D(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = dotProduct2D(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			multiply2DScalar(right, -1)
		}
		var left = getMultiplication2DScalar(right, -1.0)
		multiply2DScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		multiply2DScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = getAddition2D(centerPoint, right)
		var rightBefore = getSubtraction2D(centerIntersection.intersection, rightPoint)
		var leftPoint = getAddition2D(centerPoint, left)
		var leftAfter = getSubtraction2D(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = getAddition2D(rightPoint, getMultiplication2DScalar(rightBefore, along))
			var alongRight = getAddition2D(centerPoint, getMultiplication2DScalar(right, along))
			add2D(multiply2DScalar(combinedPoint, along), multiply2DScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = getAddition2D(leftPoint, getMultiplication2DScalar(leftAfter, along))
			var alongLeft = getAddition2D(centerPoint, getMultiplication2DScalar(left, along))
			add2D(multiply2DScalar(combinedPoint, along), multiply2DScalar(alongLeft, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
	}
	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}

function zoomInterpolation(x, polyline, point, center, arrayLength) {
	center = getArrayByElements(center, arrayLength)
	point = getArrayByElements(point, arrayLength)
	var centerPoint = getSubtractionArray(point, center, arrayLength)
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	var interpolation = new Array(arrayLength).fill(0.0)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		var dimensionModulo = dimensionIndex % arrayLength
		var parameter = oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
		interpolation[dimensionModulo] = centerPoint[dimensionModulo] * (parameter - 1.0)
	}
	return interpolation
}

function zoomInterpolation2D(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 2)
}

function zoomInterpolation3D(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 3)
}
