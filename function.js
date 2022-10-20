//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addInterpolationArrayXPolylineLength(x, polyline, length, point) {
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		point[dimensionIndex % length] += oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
	}
	return point
}

function alongsFromToDistance(from, to, fromDistances, toDistances) {
	fromDistances = getValueByDefault([], fromDistances)
	if (!Array.isArray(fromDistances)) {
		fromDistances = [fromDistances]
	}
	toDistances = getValueByDefault([], toDistances)
	if (!Array.isArray(toDistances)) {
		toDistances = [toDistances]
	}
	var alongs = new Array(fromDistances.length + toDistances.length)
	from = getValueByDefault([0.0, 0.0], from)
	if (!Array.isArray(from)) {
		from = [from]
	}
	to = getValueByDefault([10.0, 0.0], to)
	if (!Array.isArray(to)) {
		to = [to]
	}
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

function arcCenterRadius(centerX, centerY, radius, fromAngle, toAngle, numberOfSides) {
	return spiralCenterRadius([centerX, centerY], radius, fromAngle, toAngle, numberOfSides)
}

function arcFromToAngle(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo) {
	return spiralFromToAngle(registry, statement, [fromX, fromY], [toX, toY], angle, numberOfSides, includeFrom, includeTo)
}

function arcFromToRadius(registry, statement, fromX, fromY, toX, toY, radius, clockwise, numberOfSides, includeFrom, includeTo) {
	return spiralFromToRadius(registry, statement, [fromX, fromY], [toX, toY], radius, clockwise, numberOfSides, includeFrom, includeTo)
}

function arcTo(registry, statement, toX, toY, numberOfSides, includeTo) {
	return spiralBeforeFromTo(
	registry, statement, [undefined, undefined], [undefined, undefined], [toX, toY], numberOfSides, false, false, includeTo)
}

function arcToAngle(registry, statement, toX, toY, angle, numberOfSides, includeTo) {
	return spiralFromToAngle(registry, statement, [undefined, undefined], [toX, toY], angle, numberOfSides, false, includeTo)
}

function arcToRadius(registry, statement, toX, toY, radius, clockwise, numberOfSides, includeTo) {
	return spiralFromToRadius(
	registry, statement, [undefined, undefined], [toX, toY], radius, clockwise, numberOfSides, false, includeTo)
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

function fillet(registry, statement, pointX, pointY, radius, numberOfSides) {
	return filletPoint(registry, statement, [pointX, pointY], radius, numberOfSides)
}

function filletPoint(registry, statement, point, radius, numberOfSides) {
	numberOfSides = getValueByDefault(24, numberOfSides)
	radius = getValueByDefault(1.0, radius)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(point, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(point, 0)
	if (variableMap.has('_values')) {
		var values = variableMap.get('_values')
		values.push('filletTaggedPoints(' + point[0] + ',' + point[1] + ',' + radius + ',' + numberOfSides + ')')
	}
	else {
		noticeByList(['No values could be found for fillet in function.', statement])
	}
	return [point]
}

function filletTaggedPoints(registry, statement, pointX, pointY, radius, numberOfSides) {
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
				var beginPoint = points[(pointIndex - 1 + points.length) % points.length]
				var endPoint = points[(pointIndex + 1) % points.length]
				var remainingPoints = points.slice(pointIndex + 1)
				points.length = pointIndex
				addFilletedPointsByTriple(beginPoint, point, endPoint, points, gDoublePi / numberOfSides, numberOfSides, radius)
				pushArray(points, remainingPoints)
				return [points.pop()]
			}
		}
	}
	return [[]]
}

//deprecated23
function floatByKeyID(registry, statement, key, id) {
	return parseFloat(getStatementByID(registry, statement, id).attributeMap.get(key))
}

function floatByIDKey(registry, statement, id, key) {
	return parseFloat(getStatementByID(registry, statement, id).attributeMap.get(key))
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

function interpolationArrayXPolylineLength(x, polyline, length) {
	return addInterpolationArrayXPolylineLength(x, polyline, length, new Array(length).fill(0.0))
}

function interpolationYXPolyline(x, polyline) {
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	return (1.0 - along) * interpolationAlong[1][1] + along * interpolationAlong[2][1]
}

function intervalsFromQuantityIncrement(from, quantity, increments, includeFrom) {
	from = getValueByDefault(0.0, from)
	includeFrom = getValueByDefault(true, includeFrom)
	increments = getValueByDefault(1.0, increments)
	if (!Array.isArray(increments)) {
		increments = [increments]
	}
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
	var quantityFloor = Math.floor(quantity)
	var properFraction = quantity - quantityFloor
	if (quantityFloor < 1) {
		return [from + (properFraction - 1.0) * increments[0]]
	}
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
		quantityFloor -= 1
	}
	if (properFraction > gClose) {
		quantityFloor += 1
	}
	var increment = 0
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		from += increment
		intervals.push(from)
	}
	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}
	return intervals
}

function intervalsFromToAlong(from, to, alongs, includeFrom, includeTo) {
	alongs = getValueByDefault(0.5, alongs)
	if (!Array.isArray(alongs)) {
		alongs = [alongs]
	}
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

function intervalsFromToIncrement(from, to, minimumIncrements, includeFrom, includeTo) {
	from = getValueByDefault(0.0, from)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	minimumIncrement = getValueByDefault(1.0, minimumIncrement)
	var totalLength = 0.0
	if (Array.isArray(minimumIncrements)) {
		for (var minimumIncrement of minimumIncrements) {
			totalLength += minimumIncrement
		}
	}
	else {
		totalLength = minimumIncrements
		minimumIncrements = [minimumIncrements]
	}
	to = getValueByDefault(10.0, to)
	var difference = to - from
	var numberUntilEnd = Math.floor((Math.abs(difference) + gClose) / Math.abs(totalLength))
	if (numberUntilEnd == 0) {
		noticeByList(['numberUntilEnd is 0 in intervalsFromToIncrement in function.', from, to, minimumIncrements])
		return [from]
	}
	if (totalLength == 0.0) {
		noticeByList(['totalLength is 0 in intervalsFromToIncrement in function.', from, to, minimumIncrements])
		return [from]
	}
	var incrementMultiplier = difference / numberUntilEnd / totalLength
	for (var incrementIndex = 0; incrementIndex < minimumIncrements.length; incrementIndex++) {
		minimumIncrements[incrementIndex] *= incrementMultiplier
	}
	numberUntilEnd -= 1
	var intervals = []
	if (includeFrom) {
		intervals.push(from)
	}
	var arrayIndex = intervals.length
	intervals.length = intervals.length + numberUntilEnd
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		for (var minimumIncrement of minimumIncrements) {
			from += minimumIncrement
			intervals[arrayIndex++] = from
		}
	}
	if (includeTo) {
		intervals.push(to)
	}
	return intervals
}

//deprecated23
function mirror(registry, statement, center, direction) {
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
		if (!Array.isArray(direction)) {
			direction = [direction]
		}
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
		if (!Array.isArray(direction)) {
			direction = [direction]
		}
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
	setUndefinedElementsToValue(point, 0)
	variableMap.set(name, point.toString())
	return point
}

function pointsByID(registry, statement, id) {
	return getPointsHD(registry, getStatementByID(registry, statement, id))
}

function polar(angle, radius) {
	return getPolarRadius(getValueByDefault(0.0, angle) * gRadiansPerDegree, getValueByDefault(1.0, radius))
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
	if (!Array.isArray(before)) {
		before = [before]
	}
	before.length = 2
	to = getValueByDefault(10.0, to)
	if (!Array.isArray(to)) {
		to = [to]
	}
	if (!Array.isArray(from)) {
		from = [from]
	}
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
	setUndefinedElementsToValue(from, 0)
	to.length = from.length
	to[0] = getValueByDefault(10.0, to[0])
	setUndefinedElementsToValue(to, 0)
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
	if (crossProduct2D(beforeFrom, fromTo) > 0.0) {
		angle = -angle
	}
	pushArray(arc, spiralFromToAngle(registry, statement, from, to, angle, numberOfSides, includeFrom, includeTo))
	return arc
}

function spiralCenterRadius(center, radius, fromAngle, toAngle, numberOfSides, toZ) {
	center = getArrayByElements(center, 2)
	radius = getValueByDefault(10.0, radius)
	fromAngle = getValueByDefault(0.0, fromAngle) * gRadiansPerDegree
	toAngle = getValueByDefault(360.0, toAngle) * gRadiansPerDegree
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var angleDifference = toAngle - fromAngle
	var wasAngleDifferenceNegative = angleDifference < 0.0
	angleDifference = Math.abs(angleDifference)
	var numberOfRotations = Math.floor(angleDifference / gDoublePi - gClose)
	angleDifference -= numberOfRotations * gDoublePi
	var numberOfArcSides = Math.ceil(numberOfSides * angleDifference / gDoublePi)
	if (wasAngleDifferenceNegative) {
		angleDifference = -angleDifference
	}
	var rotator = getPolar(angleDifference / numberOfArcSides)
	var centerFrom = getPolarRadius(fromAngle, radius)
	var zAddition = null
	if (center.length > 2) {
		zAddition = (getValueByDefault(0.0, toZ) - center[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	if (Math.abs(angleDifference - gDoublePi) > gClose) {
		numberOfArcSides += 1
	}
	var arc = new Array(numberOfArcSides)
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		arc[pointIndex] = getAdditionArray(center, centerFrom)
		rotate2D(centerFrom, rotator)
		if (zAddition != null) {
			centerFrom[2] += zAddition
		}
	}
	return arc
}

function spiralFromToAngle(registry, statement, from, to, angle, numberOfSides, includeFrom, includeTo) {
	to = getValueByDefault(10.0, to)
	if (!Array.isArray(to)) {
		to = [to]
	}
	if (!Array.isArray(from)) {
		from = [from]
	}
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	setUndefinedElementsToValue(to, 0.0)
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
		var right = [fromTo[1], -fromTo[0]]
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
	var rotator = getPolar(angle / numberOfArcSides)
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2D(centerFrom, rotator)
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

function spiralFromToRadius(registry, statement, from, to, radius, clockwise, numberOfSides, includeFrom, includeTo) {
	to = getValueByDefault(10.0, to)
	if (!Array.isArray(to)) {
		to = [to]
	}
	if (!Array.isArray(from)) {
		from = [from]
	}
	from.length = Math.max(2, from.length, to.length)
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0)
	to.length = from.length
	setUndefinedElementsToValue(to, 0)
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	var clockwise = getValueByDefault(true, clockwise)
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = length2D(fromTo)
	var arc = []
	if (includeFrom) {
		arc.push(from)
	}
	if (fromToLength == 0.0) {
		noticeByList(['fromToLength is 0 in arcFromToRadius in function.', from, to, radius])
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
	if (clockwise != radius > 0.0) {
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
	if (!clockwise) {
		angle = -angle
	}
	var zAddition = null
	if (from.length > 2) {
		zAddition = (to[2] - from[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}
	var rotator = getPolar(angle / numberOfArcSides)
	multiply2DScalar(centerFrom, Math.abs(radius))
	numberOfArcSides -= 1
	var arrayIndex = arc.length
	arc.length = arc.length + numberOfArcSides
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		rotate2D(centerFrom, rotator)
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
	return spiralBeforeFromTo(
	registry, statement, [undefined, undefined], [undefined, undefined], to, numberOfSides, false, false, includeTo)
}

function spiralToAngle(registry, statement, to, angle, numberOfSides, includeTo) {
	return spiralFromToAngle(registry, statement, [undefined, undefined], to, angle, numberOfSides, false, includeTo)
}

function spiralToRadius(registry, statement, to, radius, clockwise, numberOfSides, includeTo) {
	return spiralFromToRadius(registry, statement, [undefined, undefined], to, radius, clockwise, numberOfSides, false, includeTo)
}

function stepsFromQuantityIncrement(registry, statement, from, quantity, increments, includeFrom) {
	if (!Array.isArray(from)) {
		from = [from]
	}
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
	if (!Array.isArray(increments)) {
		increments = [increments]
	}
	quantity = getValueByDefault(11, quantity)
	if (quantity == 0.0) {
		noticeByList(['quantity is 0 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
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
	var quantityFloor = Math.floor(quantity)
	var properFraction = quantity - quantityFloor
	if (quantityFloor < 1) {
		return addArray(from, multiplyArrayScalar(increments[0], (properFraction - 1.0)))
	}
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is 0 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}
	var steps = []
	if (includeFrom) {
		steps.push(from.slice(0))
		quantityFloor -= 1
	}
	if (properFraction > gClose) {
		quantityFloor += 1
	}
	var increment = []
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		addArray(from, increment)
		steps.push(from.slice(0))
	}
	if (properFraction > gClose) {
		steps[steps.length - 1] = addArray(steps[steps.length - 2].slice(0), multiplyArrayScalar(increment, properFraction))
	}
	return steps
}

function stepsQuantityIncrement(registry, statement, quantity, increments) {
	increments = getValueByDefault([1.0, 0.0], increments)
	if (!Array.isArray(increments)) {
		increments = [increments]
	}
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

function stepsFromToAlong(registry, statement, from, to, alongs, includeFrom, includeTo) {
	alongs = getValueByDefault(0.5, alongs)
	if (!Array.isArray(alongs)) {
		alongs = [alongs]
	}
	if (!Array.isArray(from)) {
		from = [from]
	}
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			setUndefinedElementsToArray(from, points[points.length - 1])
		}
	}
	setUndefinedElementsToValue(from, 0.0)
	to = getValueByDefault(10.0, to)
	if (!Array.isArray(to)) {
		to = [to]
	}
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

function stepsFromToQuantity(registry, statement, from, to, quantity, includeFrom, includeTo) {
	includeFrom = getValueByDefault(true, includeFrom)
	includeTo = getValueByDefault(true, includeTo)
	quantity = getValueByDefault(11, quantity)
	numberOfAlongs = Math.round(Math.abs(quantity))
	numberOfAlongs += !includeFrom + !includeTo
	var increment = 1.0 / (numberOfAlongs - 1)
	numberOfAlongs -= 2
	var alongs = new Array(numberOfAlongs)
	if (quantity < 0.0) {
		increment = -increment
	}
	var total = 0.0
	for (var incrementIndex = 0; incrementIndex < numberOfAlongs; incrementIndex++) {
		total += increment
		alongs[incrementIndex] = total
	}
	return stepsFromToAlong(registry, statement, from, to, alongs, includeFrom, includeTo)
}

function stepsToAlong(registry, statement, to, alongs, includeTo) {
	if (!Array.isArray(to)) {
		to = [to]
	}
	return stepsFromToAlong(registry, statement, new Array(to.length), to, alongs, false, includeTo)
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
