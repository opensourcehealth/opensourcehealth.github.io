//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function getSpiralCenterRadiusDifference(
center = [0.0, 0.0], radius = 1.0, angleDifference, fromAngle, numberOfSides = 24, toZ = 0.0, includeFrom = true, includeTo = true) {
	var numberOfSides = Math.max(numberOfSides, 3)
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gPI2 - gClose)
	var rotator = Vector.polarCounterclockwise(angleDifference / numberOfArcSides)
	var centerFrom = Vector.polarRadius(fromAngle, radius)
	var zAddition = undefined
	if (center.length > 2) {
		zAddition = (toZ - center[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}

	numberOfArcSides++
	var arc = new Array(numberOfArcSides)
	for (var pointIndex = 0; pointIndex < numberOfArcSides; pointIndex++) {
		arc[pointIndex] = Vector.getAdditionArray(center, centerFrom)
		Vector.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
	}

	return removeUnincluded(arc, includeFrom, includeTo)
}

function getParabolicFrom(fromPoint, toPoint, fromLevel, x, xMultiplier, zAddition) {
	fromPoint = fromPoint.slice(0)
	fromPoint[0] += x
	if (fromLevel) {
		fromPoint[1] += x * x * xMultiplier
	}
	else {
		x = toPoint[0] - x
		x *= x * xMultiplier
		fromPoint[1] += toPoint[1] - x
	}

	if (zAddition != undefined) {
		fromPoint[2] += zAddition * x
	}

	return fromPoint
}

function parabolaFromToQuantityOnly(fromPoint, toPoint, quantity = 11, fromLevel = true, horizontal = true, includeFrom, includeTo) {
	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	fromPoint = fromPoint.slice(0)
	if (!horizontal) {
		swap2DPoint(fromPoint)
		toPoint = toPoint.slice(0)
		swap2DPoint(toPoint)
	}

	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint, 3)
	if (fromTo[0] == 0.0) {
		noticeByList(['fromTo[0] is 0 in parabolaFromTo in polyline.', fromPoint, toPoint, quantity])
		return []
	}

	if (quantity < 0.0) {
		fromTo[0] = -fromTo[0]
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in parabolaFromTo in polyline.', fromPoint, toPoint, quantity])
		return []
	}

	var properFraction = quantity - quantityFloor
	var parabola = [fromPoint]
	quantityFloor--
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	var arrayIndex = parabola.length
	parabola.length = parabola.length + quantityFloor
	var xMultiplier = fromTo[1] / fromTo[0] / fromTo[0]
	var incrementX = fromTo[0] / quantity
	var x = incrementX
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = fromTo[2] / fromTo[0]
	}

	for (var count = 0; count < quantityFloor; count++) {
		parabola[arrayIndex++] = getParabolicFrom(fromPoint, fromTo, fromLevel, x, xMultiplier, zAddition)
		x += incrementX
	}

	if (properFraction > gClose) {
		x = parabola[parabola.length - 2][0] + properFraction * incrementX
		parabola[parabola.length - 1] = getParabolicFrom(fromPoint, fromTo, fromLevel, x, xMultiplier, zAddition)
	}

	if (!horizontal) {
		swap2DPolyline(parabola)
	}

	return removeUnincluded(parabola, includeFrom, includeTo)
}


var Polyline = {
arcBeforeFromTo: function(registry, statement, beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo) {
	return Polyline.spiralBeforeFromTo(
	registry, statement, [beforeX, beforeY], [fromX, fromY], [toX, toY], numberOfSides, includeBefore, includeFrom, includeTo)
},

arcCenterRadius: function(centerX, centerY, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo) {
	return Polyline.spiralCenterRadius([centerX, centerY], radius, fromAngle, toAngle, numberOfSides, undefined, includeFrom, includeTo)
},

arcFromToAngle: function(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides, includeFrom, includeTo) {
	return Polyline.spiralFromToAngle(registry, statement, [fromX, fromY], [toX, toY], angle, numberOfSides, includeFrom, includeTo)
},

arcFromToRadius: function(registry, statement, fromX, fromY, toX, toY, radius, counterclockwise, numberOfSides, includeFrom, includeTo) {
	return Polyline.spiralFromToRadius(
	registry, statement, [fromX, fromY], [toX, toY], radius, counterclockwise, numberOfSides, includeFrom, includeTo)
},

arcTo: function(registry, statement, toX, toY, numberOfSides, includeTo) {
	return Polyline.spiralBeforeFromTo(
	registry, statement, [undefined, undefined], [undefined, undefined], [toX, toY], numberOfSides, false, false, includeTo)
},

arcToAngle: function(registry, statement, toX, toY, angle, numberOfSides, includeTo) {
	return Polyline.spiralFromToAngle(registry, statement, [undefined, undefined], [toX, toY], angle, numberOfSides, false, includeTo)
},

arcToRadius: function(registry, statement, toX, toY, radius, counterclockwise, numberOfSides, includeTo) {
	return Polyline.spiralFromToRadius(
	registry, statement, [undefined, undefined], [toX, toY], radius, counterclockwise, numberOfSides, false, includeTo)
},

arcWaveXFromToHeight: function(xs, from = 0.0, to = 4.0, height = 1.0, phase = 0.0) {
	var xs = Value.getValueDefault(xs, intervalsFromToIncrement(from, to, 0.5))
	var arcs = new Array(xs.length)
	for (var xIndex = 0; xIndex < xs.length; xIndex++) {
		arcs[xIndex] = [xs[xIndex], arcYXFromToHeight(xs[xIndex], from, to, height, phase)]
	}

	return arcs
},

arcYXFromToHeight: function(x = 0.0, from = 0.0, to = 4.0, height = 1.0, phase = 0.0) {
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
},

insetsHeightAngle: function(height4 = 4.0, overhangAngle = 45.0, numberOfSegments = 4) {
	numberOfSegments = Math.max(numberOfSegments, 1)
	overhangAngle *= gRadiansPerDegree
	var insets = new Array(numberOfSegments + 1)
	var radius = height4 / Math.sin(overhangAngle)
	var radiusSquared = radius * radius
	for (var insetIndex = 0; insetIndex < insets.length; insetIndex++) {
		var y = insetIndex * height4 / numberOfSegments
		var down = height4 - y
		insets[insetIndex] = [radius - Math.sqrt(radiusSquared - down * down), y]
	}

	return insets
},

lattice2D: function(numberOfXCells = 2, numberOfYCells, cellWidth = 10, cellHeight) {
	numberOfYCells = Value.getValueDefault(numberOfYCells, numberOfXCells)
	cellHeight = Value.getValueDefault(cellHeight, cellWidth)
	var latticePoints = new Array(numberOfXCells * numberOfYCells)
	var latticePointIndex = 0
	var startX = (1 - numberOfXCells) * cellWidth * 0.5
	var y = (1 - numberOfYCells) * cellHeight * 0.5
	for (var cellIndexY = 0; cellIndexY < numberOfYCells; cellIndexY++) {
		x = startX
		for (var cellIndexX = 0; cellIndexX < numberOfXCells; cellIndexX++) {
			latticePoints[latticePointIndex] = [x, y]
			latticePointIndex++
			x += cellWidth
		}
		y += cellHeight
	}

	return latticePoints
},

latticePolygon: function(polygon, cellWidth = 10, cellHeight) {
	polygon = Value.getValueDefault(polygon, [[0.0, 0.0], [20.0, 0.0], [0.0, 20.0]])
	cellWidth = Math.abs(cellWidth)
	cellHeight = Value.getValueDefault(cellHeight, cellWidth)
	if (cellHeight == 0.0 || cellWidth == 0.0) {
		return []
	}

	var halfCellHeight = cellHeight * 0.5
	var halfCellWidth = cellWidth * 0.5
	polygon = arrayKit.getArraysCopy(polygon)
	multiplyArraysByIndex(polygon, 1.0 / cellHeight, 1)
	addArraysByIndex(polygon, -0.5, 1)
	var intersectionPairsMap = getIntersectionPairsMap([polygon])
	var latticePoints = []
	for (var intersectionPairsKey of intersectionPairsMap.keys()) {
		var intersectionPairs = intersectionPairsMap.get(intersectionPairsKey)
		var y = intersectionPairsKey * cellHeight + halfCellHeight
		for (var intersectionPair of intersectionPairs) {
			var x = Math.floor(intersectionPair.beginIntersection / cellWidth + 0.5) * cellWidth + halfCellWidth
			for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
				if (x > intersectionPair.endIntersection) {
					break
				}
				latticePoints.push([x, y])
				x += cellWidth
			}
		}
	}

	return latticePoints
},

mirror: function(registry, statement, center, direction, isSegment) {
	var variableMap = getVariableMapByStatement(statement)
	if (!variableMap.has('_points')) {
		noticeByList(['In mirror in polyline the variableMap does not have _points:', statement])
		return [[]]
	}

	var points = variableMap.get('_points')
	if (points.length == 0) {
		noticeByList(['In mirror in polyline _points length is 0:', points, toX, toY, statement])
		return [[]]
	}

	var centerVector = {center:center, vector:Vector.polarCounterclockwise(Value.getValueDefault(direction, 90.0) * gRadiansPerDegree)}
	var mirrorStart = points.length
	if (Value.getValueFalse(isSegment)) {
		if (points.length < 3) {
			noticeByList(['In mirror in polyline _points length is shorter than 3:', points, toX, toY, statement])
			return [[]]
		}
		centerVector = getCenterVectorMirrorStart(mirrorStart, points)
		mirrorStart = centerVector.mirrorStart
	}

	return getMirrorPoints(centerVector, mirrorStart, points)
},

modifyObject_Private: function() {
	addOptionMapToObject('arcBeforeFromTo arcFromToAngle arcFromToRadius arcTo arcToAngle arcToRadius mirror'.split(' '), Polyline, gMapR)
	addOptionMapToObject('parabolaFromToQuantity parabolaToQuantity spiralFromToAngle'.split(' '), Polyline, gMapR)
	addOptionMapToObject('spiralFromToRadius spiralTo spiralToAngle spiralToRadius stepFromToBetween'.split(' '), Polyline, gMapR)
	addOptionMapToObject('stepFromToDistance stepsFromQuantityIncrement stepsFromToAlong stepsFromToBetween'.split(' '), Polyline, gMapR)
	addOptionMapToObject('stepsFromToQuantity stepsQuantityIncrement stepsToAlong stepsToBetween stepsToQuantity'.split(' '), Polyline, gMapR)
	addOptionMapToObject('stepToBetween'.split(' '), Polyline, gMapR)
	Polyline.pointsByID.optionMap = gMapRS
},

parabolaFromToQuantity: function(registry, statement, fromPoint, toPoint = [10.0, 10.0], quantity, fromLevel, horizontal, includeFrom, includeTo) {
	toPoint = arrayKit.getArrayByValue(toPoint)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	return parabolaFromToQuantityOnly(fromPoint, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo)
},

parabolaToQuantity: function(registry, statement, toPoint, quantity, fromLevel, horizontal, includeFrom, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.parabolaFromToQuantity(
	registry, statement, new Array(fromLength), toPoint, quantity, fromLevel, horizontal, false, includeTo)
},

pointsByID: function(registry, statement, id, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var points = getPointsHD(registry, getStatementByID(registry, statement, id))
	for (var point of points) {
		for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
			if (point.length < pointArgumentsLength) {
				point.length = pointArgumentsLength
				arrayKit.setUndefinedElementsToValue(point)
			}
			point[argumentIndex] += arguments[argumentIndex + 3]
		}
	}

	return points
},

sineYXFromToCycles: function(x = 0.0, from = 0.0, to = 4.0, numberOfCycles = 1.0, phase = 0.0) {
	phase *= gRadiansPerDegree
	var wavelength = Math.abs(to - from) / numberOfCycles
	return Math.sin((x + from) * gPI2 / wavelength + phase)
},

spiralBeforeFromTo: function(
registry, statement, before, fromPoint, toPoint = 10.0, numberOfSides, includeBefore = true, includeFrom, includeTo) {
	before = arrayKit.getArrayByValue(before)
	before.length = 2
	toPoint = arrayKit.getArrayByValue(toPoint)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 1) {
			arrayKit.setUndefinedElementsToArray(before, points[points.length - 2])
		}
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	before = [Value.getValueDefault(before[0], -10.0), Value.getValueDefault(before[1], 0.0)]
	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	toPoint[0] = Value.getValueDefault(toPoint[0], 10.0)
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var beforeFrom = Vector.subtract2D(fromPoint.slice(0), before)
	var beforeFromLength = Vector.length2D(beforeFrom)
	var fromTo = Vector.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	var arc = []
	if (includeBefore) {
		arc.push(before)
	}

	if (beforeFromLength == 0.0 || fromToLength == 0.0) {
		return arc
	}

	Vector.divide2DScalar(beforeFrom, beforeFromLength)
	Vector.divide2DScalar(fromTo, fromToLength)
	var angle = 4.0 * Math.asin(0.5 * Vector.distance2D(beforeFrom, fromTo)) * gDegreesPerRadian
	if (Vector.crossProduct2D(beforeFrom, fromTo) < 0.0) {
		angle = -angle
	}

	arrayKit.pushArray(arc, Polyline.spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo))
	return arc
},

spiralCenterRadius: function(center = 2, radius = 10.0, fromAngle = 0.0, toAngle = 360.0, numberOfSides, toZ, includeFrom, includeTo) {
	fromAngle *= gRadiansPerDegree
	toAngle *= gRadiansPerDegree
	return spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo)
},

spiralFromToAngle: function(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo) {
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	return spiralFromToAngleOnly(fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo)
},

spiralFromToRadius: function(
registry, statement, fromPoint, toPoint = 10.0, radius, counterclockwise = true, numberOfSides = 24, includeFrom, includeTo) {
	toPoint = arrayKit.getArrayByValue(toPoint)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = Vector.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	var arc = [fromPoint]
	if (fromToLength == 0.0) {
		noticeByList(['fromToLength is 0 in spiralFromToRadius in polyline.', fromPoint, toPoint, radius])
		return arc
	}

	var center = getMidpoint2D(fromPoint.slice(0), toPoint)
	var halfFromToLength = 0.5 * fromToLength
	radius = Value.getValueDefault(radius, halfFromToLength)
	if (Math.abs(radius) < halfFromToLength) {
		return arc
	}

	if (counterclockwise != radius > 0.0) {
		fromToLength = -fromToLength
	}

	var midpointCenterDistance = Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength
	Vector.add2D(center, Vector.multiply2DScalar([fromTo[1], -fromTo[0]], midpointCenterDistance))
	var centerFrom = normalize2D(Vector.getSubtraction2D(fromPoint, center))
	var centerTo = normalize2D(Vector.getSubtraction2D(toPoint, center))
	var angle = 2.0 * Math.asin(0.5 * Vector.distance2D(centerFrom, centerTo))
	if (radius < 0.0) {
		angle = gPI2 - angle
	}

	var numberOfArcSides = Math.ceil(numberOfSides * angle / gPI2 - gClose)
	arc.length = numberOfArcSides
	if (counterclockwise) {
		angle = -angle
	}

	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}

	var rotator = Vector.polarCounterclockwise(angle / numberOfArcSides)
	Vector.multiply2DScalar(centerFrom, Math.abs(radius))
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		Vector.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		arc[pointIndex] = Vector.getAdditionArray(center, centerFrom)
	}

	arc.push(toPoint)
	return removeUnincluded(arc, includeFrom, includeTo)
},

spiralTo: function(registry, statement, toPoint, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.spiralBeforeFromTo(
	registry, statement, new Array(fromLength), new Array(fromLength), toPoint, numberOfSides, false, false, includeTo)
},

spiralToAngle: function(registry, statement, toPoint, angle, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.spiralFromToAngle(registry, statement, new Array(fromLength), toPoint, angle, numberOfSides, false, includeTo)
},

spiralToRadius: function(registry, statement, toPoint, radius, counterclockwise, numberOfSides, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.spiralFromToRadius(
	registry, statement, new Array(fromLength), toPoint, radius, counterclockwise, numberOfSides, false, includeTo)
},

stepFromToBetween: function(registry, statement, fromPoint, toPoint, along) {
	return Polyline.stepsFromToBetween(registry, statement, fromPoint, toPoint, along)[0]
},

stepFromToDistance: function(registry, statement, fromPoint, toPoint, distance = 1.0) {
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	if (fromToLength == 0.0) {
		return fromPoint
	}

	return Vector.getAddition2D(fromPoint, Vector.multiply2DScalar(fromTo, distance / fromToLength))
},

stepsFromQuantityIncrement: function(registry, statement, fromPoint, quantity = 11, increments = [1.0, 0.0], includeFrom, includeTo) {
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	increments = arrayKit.getArrayByValue(increments)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return [fromPoint]
	}

	if (arrayKit.getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return [fromPoint]
	}

	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}

	if (quantity < 0.0) {
		for (var parameters of increments) {
			Vector.reverseSigns(parameters)
		}
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	fromPoint = fromPoint.slice(0)
	var steps = [fromPoint]
	if (properFraction > gClose) {
		quantityFloor += 1
	}

	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	var increment = []
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		Vector.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = Vector.addArray(steps[steps.length - 2].slice(0), Vector.multiplyArrayScalar(increment, properFraction))
	}

	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsFromToAlong: function(registry, statement, fromPoint, toPoint = 10.0, alongs = 0.5, includeFrom, includeTo) {
	alongs = arrayKit.getArrayByValue(alongs)
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(toPoint)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = Vector.getSubtractionArray(toPoint, fromPoint)
	var steps = [fromPoint]
	var arrayIndex = steps.length
	steps.length = steps.length + alongs.length
	for (var stepIndex = 0; stepIndex < alongs.length; stepIndex++) {
		steps[arrayIndex++] = Vector.addArray(Vector.multiplyArrayScalar(fromTo.slice(0), alongs[stepIndex]), fromPoint)
	}

	steps.push(toPoint)
	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsFromToBetween: function(registry, statement, fromPoint, toPoint, alongs) {
	return Polyline.stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, false, false)
},

stepsFromToQuantity: function(registry, statement, fromPoint, toPoint = 10.0, quantity = 11, includeFrom, includeTo) {
	fromPoint = arrayKit.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			arrayKit.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	arrayKit.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = arrayKit.getArrayByValue(toPoint)
	toPoint.length = fromPoint.length
	arrayKit.setUndefinedElementsToValue(toPoint, 0.0)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		noticeByList(['quantityFloor is less than 1 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	fromPoint = fromPoint.slice(0)
	var steps = [fromPoint.slice(0)]
	quantityFloor--
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	var increment = Vector.multiplyArrayScalar(Vector.getSubtractionArray(toPoint, fromPoint), one / quantity)
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		Vector.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = Vector.addArray(steps[steps.length - 2].slice(0), Vector.multiplyArrayScalar(increment, properFraction))
	}

	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsQuantityIncrement: function(registry, statement, quantity, increments) {
	increments = arrayKit.getArrayByValue(increments)
	if (increments.length == 0) {
		noticeByList(['increments.length is 0 in stepsQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return []
	}

	if (arrayKit.getIsEmpty(increments[0])) {
		noticeByList(['increments zero is empty in stepsQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return []
	}

	if (!Array.isArray(increments[0])) {
		increments = [increments]
	}

	var fromPoint = new Array(increments[0].length)
	return Polyline.stepsFromQuantityIncrement(registry, statement, fromPoint, quantity, increments, false)
},

stepsToAlong: function(registry, statement, toPoint, alongs, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.stepsFromToAlong(registry, statement, new Array(fromLength), toPoint, alongs, false, includeTo)
},

stepsToBetween: function(registry, statement, toPoint, alongs) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.stepsFromToBetween(registry, statement, new Array(fromLength), toPoint, alongs)
},

stepsToQuantity: function(registry, statement, toPoint, quantity, includeTo) {
	var fromLength = 2
	if (Array.isArray(toPoint)) {
		fromLength = toPoint.length
	}

	return Polyline.stepsFromToQuantity(registry, statement, new Array(fromLength), toPoint, quantity, false, includeTo)
},

stepToBetween: function(registry, statement, toPoint, along) {
	return Polyline.stepsToBetween(registry, statement, toPoint, along)[0]
},

zigzag: function(polyline, radiusMultiplier = 0.2, numberOfSides = 24) {
	if (polyline.length < 3) {
		return polyline
	}

	var centerIntersections = new Array(polyline.length)
	centerIntersections[0] = {intersection:polyline[0]}
	centerIntersections[polyline.length - 1] = {intersection:polyline[polyline.length - 1]}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = Vector.getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = Vector.length2D(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = Vector.getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = Vector.length2D(centerEnd)
		var intersection = Vector.getMultiplication2DScalar(centerBegin, 0.5)
		Vector.add2D(intersection, centerPoint)
		Vector.divide2DScalar(centerBegin, centerBeginLength)
		Vector.divide2DScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}

	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = Vector.getAddition2D(centerIntersection.centerBegin, centerIntersection.centerEnd)
		normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, Vector.distance2D(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = Vector.dotProduct2D(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			Vector.multiply2DScalar(right, -1)
		}
		var left = Vector.getMultiplication2DScalar(right, -1.0)
		Vector.multiply2DScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		Vector.multiply2DScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = Vector.getAddition2D(centerPoint, right)
		var rightBefore = Vector.getSubtraction2D(centerIntersection.intersection, rightPoint)
		var leftPoint = Vector.getAddition2D(centerPoint, left)
		var leftAfter = Vector.getSubtraction2D(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = Vector.getAddition2D(rightPoint, Vector.getMultiplication2DScalar(rightBefore, along))
			var alongRight = Vector.getAddition2D(centerPoint, Vector.getMultiplication2DScalar(right, along))
			Vector.add2D(Vector.multiply2DScalar(combinedPoint, along), Vector.multiply2DScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = Vector.getAddition2D(leftPoint, Vector.getMultiplication2DScalar(leftAfter, along))
			var alongLeft = Vector.getAddition2D(centerPoint, Vector.getMultiplication2DScalar(left, along))
			Vector.add2D(Vector.multiply2DScalar(combinedPoint, along), Vector.multiply2DScalar(alongLeft, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
	}

	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}

}


function spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo) {
	if (Number.isNaN(fromAngle) || Number.isNaN(toAngle)) {
		return []
	}

	return getSpiralCenterRadiusDifference(center, radius, toAngle - fromAngle, fromAngle, numberOfSides, toZ, includeFrom, includeTo)
}

function spiralFromToAngleOnly(fromPoint, toPoint, angle = Math.PI, numberOfSides = 24, includeFrom, includeTo) {
	var fromTo = Vector.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = Vector.length2D(fromTo)
	var arc = [fromPoint]
	if (fromToLength == 0.0) {
		return removeUnincluded(arc, includeFrom, includeTo)
	}

	angle *= gRadiansPerDegree
	if (Math.abs(angle) < gClose) {
		return [fromPoint, toPoint]
	}

	var fromToRight = Vector.multiply2DScalar([-fromTo[1], fromTo[0]], 0.5 / Math.tan(angle * 0.5))
	var center = Vector.add2D(getMidpoint2D(fromPoint.slice(0), toPoint), fromToRight)
	var centerFrom = Vector.getSubtraction2D(fromPoint, center)
	var numberOfArcSides  = Math.ceil(numberOfSides * Math.abs(angle) / gPI2 - gClose)
	arc.length = numberOfArcSides
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}

	var rotator = Vector.polarCounterclockwise(angle / numberOfArcSides)
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		Vector.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		arc[pointIndex] = Vector.getAdditionArray(center, centerFrom)
	}

	arc.push(toPoint)
	return removeUnincluded(arc, includeFrom, includeTo)
}

