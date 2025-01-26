//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html outset

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
		arc[pointIndex] = VectorFast.getAdditionArray(center, centerFrom)
		VectorFast.rotate2DVector(centerFrom, rotator)
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
	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	fromPoint = fromPoint.slice(0)
	if (!horizontal) {
		swap2DPoint(fromPoint)
		toPoint = toPoint.slice(0)
		swap2DPoint(toPoint)
	}

	var fromTo = VectorFast.getSubtractionArray(toPoint, fromPoint, 3)
	if (fromTo[0] == 0.0) {
		printCaller(['fromTo[0] is 0 in parabolaFromTo in polyline.', fromPoint, toPoint, quantity])
		return []
	}

	if (quantity < 0.0) {
		fromTo[0] = -fromTo[0]
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		printCaller(['quantityFloor is less than 1 in parabolaFromTo in polyline.', fromPoint, toPoint, quantity])
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
add2D: function(arrays = 0.0, adder2D = 0.0) {
	arrays = Vector.getArrayByValue(arrays)
	adder2D = Vector.getArrayByElements(adder2D, 2)
	for (var array of arrays) {
		VectorFast.add2D(Vector.getArrayByElements(array, 2), adder2D)
	}

	return arrays
},

add2Ds: function(arrayArrays = 0.0, adder2D) {
	arrayArrays = Vector.getArrayByElements(arrayArrays)
	for (var arrays of arrayArrays) {
		Polyline.add2D(arrays, adder2D)
	}

	return arrayArrays
},

add3D: function(arrays = 0.0, adder3D = 0.0) {
	arrays = Vector.getArrayByValue(arrays)
	adder3D = Vector.getArrayByElements(adder3D, 3)
	for (var array of arrays) {
		VectorFast.add3D(Vector.getArrayByElements(array, 3), adder3D)
	}

	return arrays
},

addArray: function(arrays = 0.0, adders = 0.0, until) {
	arrays = Vector.getArrayByValue(arrays)
	adders = Vector.getArrayByValue(adders)
	for (var array of arrays) {
		Vector.addArray(array, adders, until)
	}

	return arrays
},

addArrayByIndex: function(arrayArrays = 0.0, addition, index) {
	arrayArrays = Vector.getArrayByValue(arrayArrays)
	for (var arrays of arrayArrays) {
		Polyline.addByIndex(arrays, addition, index)
	}

	return arrayArrays
},

addByIndex: function(arrays = 0.0, addition = 0.0, index = 0) {
	arrays = Vector.getArrayByValue(arrays)
	for (var array of arrays) {
		array[index] += addition
	}

	return arrays
},

addPointIndexToGridMap: function(gridMap, halfMinusOverRadius, point, pointIndex) {
	var key = Math.round(point[0] * halfMinusOverRadius).toString() + ' ' + Math.round(point[1] * halfMinusOverRadius).toString()
	MapKit.addElementToMapArray(gridMap, key, pointIndex)
},

addPolygonsToPolylines: function(polylines, polygons) {
	for (var polygon of polygons) {
		if (polygon.length > 0) {
			polygon.push(polygon[0])
			polylines.push(polygon)
		}
	}
},

addXIntersectionsByPolyline: function(xIntersections, xyPolyline, y) {
	for (var pointIndex = 0; pointIndex < xyPolyline.length - 1; pointIndex++) {
		Polyline.addXIntersectionsBySegment(xyPolyline[pointIndex], xyPolyline[pointIndex + 1], xIntersections, y)
	}
},

addXIntersectionsByPolylineClose: function(xIntersections, xyPolyline, y) {
	Polyline.addXIntersectionsByPolyline(xIntersections, xyPolyline, y - gClose)
	Polyline.addXIntersectionsByPolyline(xIntersections, xyPolyline, y + gClose)
},

addXIntersectionsBySegment: function(begin, end, xIntersections, y) {
//	if ((begin[1] == y) && (end[1] == y)) {
//		xIntersections.push(begin[0])
//		xIntersections.push(end[0])
//	}
//	else {
	if ((begin[1] < y) != (end[1] < y)) {
		var beginPortion = (end[1] - y) / (end[1] - begin[1])
		xIntersections.push(beginPortion * begin[0] + (1.0 - beginPortion) * end[0])
	}
//	}
},

arcBeforeFromTo: function(registry, statement, beforeX, beforeY, fromX, fromY, toX, toY, numberOfSides, includeBefore, includeFrom, includeTo) {
	return Polyline.spiralBeforeFromTo(
	registry, statement, [beforeX, beforeY], [fromX, fromY], [toX, toY], numberOfSides, includeBefore, includeFrom, includeTo)
},

arcCenterRadius: function(centerX = 0.0, centerY = 0.0, radius, fromAngle, toAngle, numberOfSides, includeFrom, includeTo) {
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
	var wavePortion = Value.getPositiveModulo(phase / 360.0 + (x -from) / wavelength)
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

areArraysLong: function(arrays, minimumLength) {
	if (!Array.isArray(arrays)) {
		return false
	}

	for (var array of arrays) {
		if (!Vector.isArrayLong(array, minimumLength)) {
			return false
		}
	}

	return true
},

convertPointStringsToPointLists: function(pointStrings) {
	for (stringIndex = 0; stringIndex < pointStrings.length; stringIndex++) {
		pointStrings[stringIndex] = getPointsByString(pointStrings[stringIndex])
	}

	return pointStrings
},

copies: function(arrayArrays) {
	var arrayArraysCopy = new Array(arrayArrays.length)
	for (var arraysIndex = 0; arraysIndex < arrayArrays.length; arraysIndex++) {
		arrayArraysCopy[arraysIndex] = Polyline.copy(arrayArrays[arraysIndex])
	}

	return arrayArraysCopy
},

copy: function(arrays) {
	var arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].slice(0)
	}

	return arraysCopy
},

extend: function(polyline, distance) {
	if (polyline.length < 2) {
		return polyline
	}

	var afterPoint = Vector.interpolationFromToDistance2D(polyline[polyline.length - 1], polyline[polyline.length - 2], -distance)
	if (afterPoint != undefined) {
		polyline[polyline.length - 1] = afterPoint
	}

	var beforePoint = Vector.interpolationFromToDistance2D(polyline[0], polyline[1], -distance)
	if (beforePoint != undefined) {
		polyline[0] = beforePoint
	}

	return polyline
},

getAddition2D: function(elements = 0.0, adder2D = 0.0) {
	adder2D = Vector.getArrayByElements(adder2D, 2)
	elements = Vector.getArrayByElements(elements)
	var addition2D = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		addition2D[elementIndex] = VectorFast.getAddition2D(Vector.getArrayByElements(elements[elementIndex], 2), adder2D)
	}

	return addition2D
},

getString: function(arrays) {
	var joinedArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		joinedArrays[arrayIndex] = arrays[arrayIndex].join(',')
	}

	return joinedArrays.join(' ')
},

getInterpolatedPolylineCenter: function(interpolation, polyline, center, along) {
	return Polyline.interpolationPolylineCenter(Polyline.copy(interpolation), polyline, center, along)
},

getMultiplication2DScalar: function(elements = 0.0, multiplierScalar, until) {
	return Polyline.multiply2DsScalar(Polyline.copy(Vector.getArrayByElements(elements)), multiplierScalar, until)
},

getOutset: function(polyline, outset) {
	if (!Polyline.isLongArray(polyline, 2)) {
		return undefined
	}

	removeIdentical2DPoints(polyline)
	if (polyline.length < 2) {
		return undefined
	}

	var outsetPolyline = Polyline.copy(polyline)
	outset = Vector.fillRemaining(Vector.getArrayByValue(outset))
	var lengthMinus = polyline.length - 1
	for (var vertexIndex = 1; vertexIndex < lengthMinus; vertexIndex++) {
		outsetPolyline[vertexIndex] = getOutsetPoint(polyline, outset, vertexIndex)
	}

	var beginEnd = Vector.normalize2D(VectorFast.getSubtraction2D(polyline[1], polyline[0]))
	VectorFast.add2D(outsetPolyline[0], VectorFast.multiply2D([beginEnd[1], -beginEnd[0]], outset))
	var beginEnd = Vector.normalize2D(VectorFast.getSubtraction2D(polyline[lengthMinus], polyline[lengthMinus - 1]))
	VectorFast.add2D(outsetPolyline[lengthMinus], VectorFast.multiply2D([beginEnd[1], -beginEnd[0]], outset))
	return outsetPolyline
},

getRotation2DVector: function(points = 0.0, vector) {
	var points = Vector.getArrayByValue(points)
	var rotations2D = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		rotations2D[pointIndex] = Vector.getRotation2DVector(points[pointIndex], vector)
	}

	return rotations2D
},

highestByIndex: function(points, index = 0) {
	var highest = -Number.MAX_VALUE
	for (var point of points) {
		highest = Math.max(highest, point[index])
	}

	return highest
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

interpolationPolylineCenter: function(interpolation, polyline, center = [0.0, 0.0], along = 0.5) {
	if (Vector.isEmpty(interpolation) || Vector.isEmpty(polyline)) {
		return interpolation
	}

	if (polyline.length < 2) {
		return interpolation
	}

	if (interpolation.length > 1) {
		var combinedInterpolation = Polyline.copy(interpolation)
		for (var point of combinedInterpolation) {
			point.push(VectorFast.distance2D(center, point))
		}
		var polylineCopy = Polyline.copy(polyline)
		for (var point of polylineCopy) {
			point.push(undefined)
		}
		var combinedInterpolation = Vector.pushArray(combinedInterpolation, polylineCopy)
		for (var point of combinedInterpolation) {
			point.push(Vector.normalize2D(VectorFast.getSubtraction2D(point, center)))
		}
		combinedInterpolation.sort(Vector.compareCrossProduct)
		for (var vertexIndex = combinedInterpolation.length - 1; vertexIndex > -1; vertexIndex--) {
			var point = combinedInterpolation[vertexIndex]
			if (point[point.length - 2] == undefined) {
				var isClose = false
				var beginIndex = vertexIndex - 1
				if (beginIndex > -1) {
					var beginPoint = combinedInterpolation[beginIndex]
					if (Math.abs(VectorFast.crossProduct2D(point[point.length - 1], beginPoint[beginPoint.length - 1])) < gCloseSquared) {
						isClose = true
					}
				}
				var endIndex = vertexIndex + 1
				if (endIndex < combinedInterpolation.length) {
					var endPoint = combinedInterpolation[endIndex]
					if (Math.abs(VectorFast.crossProduct2D(point[point.length - 1], endPoint[endPoint.length - 1])) < gCloseSquared) {
						isClose = true
					}
				}
				if (isClose) {
					combinedInterpolation.splice(vertexIndex, 1)
				}
			}
		}
		for (var vertexIndex = 0; vertexIndex < combinedInterpolation.length; vertexIndex++) {
			var point = combinedInterpolation[vertexIndex]
			if (point[point.length - 2] == undefined) {
				var totalDistance = 0.0
				var divisor = 0.0
				for (var beginIndex = vertexIndex - 1; beginIndex > -1; beginIndex--) {
					var beginPoint = combinedInterpolation[beginIndex]
					if (beginPoint[beginPoint.length - 2] != undefined) {
						totalDistance = VectorFast.distance2D(center, beginPoint)
						divisor = 1.0
						break
					}
				}
				for (var endIndex = vertexIndex + 1; endIndex < combinedInterpolation.length; endIndex++) {
					var endPoint = combinedInterpolation[endIndex]
					if (endPoint[endPoint.length - 2] != undefined) {
						totalDistance += VectorFast.distance2D(center, endPoint)
						divisor += 1.0
						break
					}
				}
				var distancePoint = VectorFast.add2D(VectorFast.multiply2DScalar(point[point.length - 1], totalDistance / divisor), center)
				Vector.overwriteArrayUntil(point, distancePoint, 2)
			}
		}
		var combinedZero = VectorFast.getSubtraction2D(combinedInterpolation[0], center)
		var combinedOne = VectorFast.getSubtraction2D(combinedInterpolation[1], center)
		var interpolationZero = VectorFast.getSubtraction2D(interpolation[0], center)
		var interpolationOne = VectorFast.getSubtraction2D(interpolation[1], center)
		if ((Vector.crossProduct2D(combinedZero, combinedOne) < 0.0) != (Vector.crossProduct2D(interpolationZero, interpolationOne) < 0.0)) {
			combinedInterpolation.reverse()
		}
		Vector.popArray(combinedInterpolation)
		Vector.popArray(combinedInterpolation)
		interpolation = combinedInterpolation
	}

	var diagonalLength = undefined
	for (var point of interpolation) {
		var centerPoint = VectorFast.getSubtraction2D(point, center)
		var centerPointLength = VectorFast.length2D(centerPoint)
		if (centerPointLength > 0.0) {
			var centerPointNormalized = VectorFast.getDivision2DScalar(centerPoint, centerPointLength)
			var reverseRotation = [centerPointNormalized[0], -centerPointNormalized[1]]
			var centerRotated = VectorFast.getRotation2DVector(center, reverseRotation)
			var polylineRotated = Polyline.getRotation2DVector(polyline, reverseRotation)
			var xIntersections = []
			Polyline.addXIntersectionsByPolyline(xIntersections, polylineRotated, centerRotated[1])
			if (xIntersections.length == 0) {
				var extremeties = undefined
				if (diagonalLength == undefined) {
					var boundingBox = getBoundingBox(polyline)
					var diagonalLength = VectorFast.length2D(VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0]))
				}
				var begin = polylineRotated[0]
				var endBegin = VectorFast.getSubtraction2D(begin, polylineRotated[1])
				var endBeginLength = VectorFast.length2D(endBegin)
				if (endBeginLength > 0.0) {
					extremeties = [VectorFast.getAddition2D(begin, VectorFast.multiply2DScalar(endBegin, diagonalLength / endBeginLength))]
					extremeties.push(begin)
				}
				else {
					extremeties = [begin]
				}
				var end = polylineRotated[polylineRotated.length - 1]
				var beginEnd = VectorFast.getSubtraction2D(end, polylineRotated[polylineRotated.length - 2])
				var beginEndLength = VectorFast.length2D(beginEnd)
				if (beginEndLength > 0.0) {
					extremeties.push(end)
					extremeties.push(VectorFast.getAddition2D(end, VectorFast.multiply2DScalar(beginEnd, diagonalLength / beginEndLength)))
				}
				else {
					extremeties.push(end)
				}
				Polyline.addXIntersectionsByPolyline(xIntersections, extremeties, centerRotated[1])
			}
			for (var xIntersection of xIntersections) {
				var right = xIntersection - centerRotated[0] - centerPointLength
				if (right > 0.0) {
					VectorFast.add2D(point, VectorFast.getMultiplication2DScalar(centerPointNormalized, right * along))
					break
				}
			}
		}
	}

	return interpolation
},

isLongArray: function(elements, until = 1) {
	if (!Array.isArray(elements)) {
		return false
	}

	for (var element of elements) {
		if (!Array.isArray(element)) {
			return false
		}
		if (element.length < until) {
			return false
		}
	}

	return true
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
	polygon = Polyline.copy(polygon)
	multiplyArraysByIndex(polygon, 1.0 / cellHeight, 1)
	Polyline.addByIndex(polygon, -0.5, 1)
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
		printCaller(['In mirror in polyline the variableMap does not have _points:', statement])
		return [[]]
	}

	var points = variableMap.get('_points')
	if (points.length == 0) {
		printCaller(['In mirror in polyline _points length is 0:', points, toX, toY, statement])
		return [[]]
	}

	var centerVector = {center:center, vector:Vector.polarCounterclockwise(Value.getValueDefault(direction, 90.0) * gRadiansPerDegree)}
	var mirrorStart = points.length
	if (Value.getValueDefault(isSegment, false)) {
		if (points.length < 3) {
			printCaller(['In mirror in polyline _points length is shorter than 3:', points, toX, toY, statement])
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

multiply2Ds: function(arrays = 0.0, multiplier2D = 1.0) {
	arrays = Vector.getArrayByValue(arrays)
	multiplier2D = Vector.getArrayByElements(multiplier2D, 2)
	for (var array of arrays) {
		VectorFast.multiply2D(array, multiplier2D)
	}

	return arrays
},

multiply2DsScalar: function(arrays = 0.0, multiplier = 1.0) {
	arrays = Vector.getArrayByValue(arrays)
	for (var array of arrays) {
		VectorFast.multiply2DScalar(array, multiplier)
	}

	return arrays
},

multiply3Ds: function(arrays = 0.0, multiplier3D = 1.0) {
	arrays = Vector.getArrayByValue(arrays)
	multiplier2D = Vector.getArrayByElements(multiplier2D, 2)
	for (var array of arrays) {
		VectorFast.multiply3D(array, multiplier3D)
	}

	return arrays
},

multiply3DsScalar: function(arrays = 0.0, multiplier = 1.0) {
	arrays = Vector.getArrayByValue(arrays)
	for (var array of arrays) {
		VectorFast.multiply3DScalar(array, multiplier)
	}

	return arrays
},

parabolaFromToQuantity: function(registry, statement, fromPoint, toPoint = [10.0, 10.0], quantity, fromLevel, horizontal, includeFrom, includeTo) {
	toPoint = Vector.getArrayByValue(toPoint)
	fromPoint = Vector.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
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
				Vector.setUndefinedElementsToValue(point)
			}
			point[argumentIndex] += arguments[argumentIndex + 3]
		}
	}

	return points
},

removeClose: function(polyline, otherPolyline, distance = gClose) {
	for (var vertexIndex = polyline.length - 1; vertexIndex > -1; vertexIndex--) {
		var polylinePoint = polyline[vertexIndex]
		for (var point of otherPolyline) {
			if (VectorFast.distance2D(point, polylinePoint) < distance) {
				polyline.splice(vertexIndex, 1)
				break
			}
		}
	}
},

rotate2DVector: function(points = 0.0, vector = 1.0) {
	var points = Vector.getArrayByValue(points)
	for (var point of points) {
		Vector.rotate2DVector(point, vector)
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
	before = Vector.getArrayByValue(before)
	before.length = 2
	toPoint = Vector.getArrayByValue(toPoint)
	fromPoint = Vector.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 1) {
			Vector.setUndefinedElementsToArray(before, points[points.length - 2])
		}
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	before = [Value.getValueDefault(before[0], -10.0), Value.getValueDefault(before[1], 0.0)]
	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	toPoint[0] = Value.getValueDefault(toPoint[0], 10.0)
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	var beforeFrom = VectorFast.subtract2D(fromPoint.slice(0), before)
	var beforeFromLength = VectorFast.length2D(beforeFrom)
	var fromTo = VectorFast.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = VectorFast.length2D(fromTo)
	var arc = []
	if (includeBefore) {
		arc.push(before)
	}

	if (beforeFromLength == 0.0 || fromToLength == 0.0) {
		return arc
	}

	VectorFast.divide2DScalar(beforeFrom, beforeFromLength)
	VectorFast.divide2DScalar(fromTo, fromToLength)
	var angle = 4.0 * Math.asin(0.5 * VectorFast.distance2D(beforeFrom, fromTo)) * gDegreesPerRadian
	if (VectorFast.crossProduct2D(beforeFrom, fromTo) < 0.0) {
		angle = -angle
	}

	Vector.pushArray(arc, Polyline.spiralFromToAngle(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo))
	return arc
},

spiralCenterRadius: function(center = 2, radius = 10.0, fromAngle = 0.0, toAngle = 360.0, numberOfSides, toZ, includeFrom, includeTo) {
	fromAngle *= gRadiansPerDegree
	toAngle *= gRadiansPerDegree
	return spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, numberOfSides, toZ, includeFrom, includeTo)
},

spiralFromToAngle: function(registry, statement, fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo) {
	toPoint = Vector.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	fromPoint = Vector.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	return spiralFromToAngleOnly(fromPoint, toPoint, angle, numberOfSides, includeFrom, includeTo)
},

spiralFromToRadius: function(
registry, statement, fromPoint, toPoint = 10.0, radius, counterclockwise = true, numberOfSides = 24, includeFrom, includeTo) {
	toPoint = Vector.getArrayByValue(toPoint)
	fromPoint = Vector.getArrayByValue(fromPoint)
	fromPoint.length = Math.max(2, fromPoint.length, toPoint.length)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = VectorFast.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = VectorFast.length2D(fromTo)
	var arc = [fromPoint]
	if (fromToLength == 0.0) {
		printCaller(['fromToLength is 0 in spiralFromToRadius in polyline.', fromPoint, toPoint, radius])
		return arc
	}

	var center = Vector.interpolationFromToAlong2D(fromPoint.slice(0), toPoint)
	var halfFromToLength = 0.5 * fromToLength
	radius = Value.getValueDefault(radius, halfFromToLength)
	if (Math.abs(radius) < halfFromToLength) {
		return arc
	}

	if (counterclockwise != radius > 0.0) {
		fromToLength = -fromToLength
	}

	var midpointCenterDistance = Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength
	VectorFast.add2D(center, VectorFast.multiply2DScalar([fromTo[1], -fromTo[0]], midpointCenterDistance))
	var centerFrom = Vector.normalize2D(VectorFast.getSubtraction2D(fromPoint, center))
	var centerTo = Vector.normalize2D(VectorFast.getSubtraction2D(toPoint, center))
	var angle = 2.0 * Math.asin(0.5 * VectorFast.distance2D(centerFrom, centerTo))
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
	VectorFast.multiply2DScalar(centerFrom, Math.abs(radius))
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		VectorFast.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		arc[pointIndex] = VectorFast.getAdditionArray(center, centerFrom)
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
	fromPoint = Vector.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = Vector.getArrayByValue(Value.getValueDefault(toPoint, 10.0))
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = VectorFast.getSubtractionArray(toPoint, fromPoint)
	var fromToLength = VectorFast.length2D(fromTo)
	if (fromToLength == 0.0) {
		return fromPoint
	}

	return VectorFast.getAddition2D(fromPoint, VectorFast.multiply2DScalar(fromTo, distance / fromToLength))
},

stepsFromQuantityIncrement: function(registry, statement, fromPoint, quantity = 11, increments = [1.0, 0.0], includeFrom, includeTo) {
	fromPoint = Vector.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	increments = Vector.getArrayByValue(increments)
	if (increments.length == 0) {
		printCaller(['increments.length is 0 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return [fromPoint]
	}

	if (Vector.isEmpty(increments[0])) {
		printCaller(['increments zero is empty in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
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
		printCaller(['quantityFloor is less than 1 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
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
		VectorFast.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = VectorFast.addArray(steps[steps.length - 2].slice(0), VectorFast.multiplyArrayScalar(increment, properFraction))
	}

	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsFromToAlong: function(registry, statement, fromPoint, toPoint = 10.0, alongs = 0.5, includeFrom, includeTo) {
	alongs = Vector.getArrayByValue(alongs)
	fromPoint = Vector.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = Vector.getArrayByValue(toPoint)
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	var fromTo = VectorFast.getSubtractionArray(toPoint, fromPoint)
	var steps = [fromPoint]
	var arrayIndex = steps.length
	steps.length = steps.length + alongs.length
	for (var stepIndex = 0; stepIndex < alongs.length; stepIndex++) {
		steps[arrayIndex++] = VectorFast.addArray(VectorFast.multiplyArrayScalar(fromTo.slice(0), alongs[stepIndex]), fromPoint)
	}

	steps.push(toPoint)
	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsFromToBetween: function(registry, statement, fromPoint, toPoint, alongs) {
	return Polyline.stepsFromToAlong(registry, statement, fromPoint, toPoint, alongs, false, false)
},

stepsFromToQuantity: function(registry, statement, fromPoint, toPoint = 10.0, quantity = 11, includeFrom, includeTo) {
	fromPoint = Vector.getArrayByValue(fromPoint)
	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			Vector.setUndefinedElementsToArray(fromPoint, points[points.length - 1])
		}
	}

	Vector.setUndefinedElementsToValue(fromPoint, 0.0)
	toPoint = Vector.getArrayByValue(toPoint)
	toPoint.length = fromPoint.length
	Vector.setUndefinedElementsToValue(toPoint, 0.0)
	var one = 1.0
	if (quantity < 0.0) {
		one = -one
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		printCaller(['quantityFloor is less than 1 in stepsFromQuantityIncrement in polyline.', fromPoint, quantity, increments])
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

	var increment = VectorFast.multiplyArrayScalar(VectorFast.getSubtractionArray(toPoint, fromPoint), one / quantity)
	var arrayIndex = steps.length
	steps.length = steps.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		VectorFast.addArray(fromPoint, increment)
		steps[arrayIndex++] = fromPoint.slice(0)
	}

	if (properFraction > gClose) {
		steps[steps.length - 1] = VectorFast.addArray(steps[steps.length - 2].slice(0), VectorFast.multiplyArrayScalar(increment, properFraction))
	}

	return removeUnincluded(steps, includeFrom, includeTo)
},

stepsQuantityIncrement: function(registry, statement, quantity, increments) {
	increments = Vector.getArrayByValue(increments)
	if (increments.length == 0) {
		printCaller(['increments.length is 0 in stepsQuantityIncrement in polyline.', fromPoint, quantity, increments])
		return []
	}

	if (Vector.isEmpty(increments[0])) {
		printCaller(['increments zero is empty in stepsQuantityIncrement in polyline.', fromPoint, quantity, increments])
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

subtract2D: function(arrays = 0.0, subtractor2D = 0.0) {
	arrays = Vector.getArrayByValue(arrays)
	subtractor2D = Vector.getArrayByElements(subtractor2D, 2)
	for (var array of arrays) {
		VectorFast.subtract2D(Vector.getArrayByElements(array, 2), subtractor2D)
	}

	return arrays
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
		var centerBegin = VectorFast.getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = VectorFast.length2D(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = VectorFast.length2D(centerEnd)
		var intersection = VectorFast.getMultiplication2DScalar(centerBegin, 0.5)
		VectorFast.add2D(intersection, centerPoint)
		VectorFast.divide2DScalar(centerBegin, centerBeginLength)
		VectorFast.divide2DScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}

	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = VectorFast.getAddition2D(centerIntersection.centerBegin, centerIntersection.centerEnd)
		Vector.normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, VectorFast.distance2D(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = VectorFast.dotProduct2D(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			VectorFast.multiply2DScalar(right, -1)
		}
		var left = VectorFast.getMultiplication2DScalar(right, -1.0)
		VectorFast.multiply2DScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		VectorFast.multiply2DScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = VectorFast.getAddition2D(centerPoint, right)
		var rightBefore = VectorFast.getSubtraction2D(centerIntersection.intersection, rightPoint)
		var leftPoint = VectorFast.getAddition2D(centerPoint, left)
		var leftAfter = VectorFast.getSubtraction2D(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = VectorFast.getAddition2D(rightPoint, VectorFast.getMultiplication2DScalar(rightBefore, along))
			var alongRight = VectorFast.getAddition2D(centerPoint, VectorFast.getMultiplication2DScalar(right, along))
			VectorFast.add2D(VectorFast.multiply2DScalar(combinedPoint, along), VectorFast.multiply2DScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = VectorFast.getAddition2D(leftPoint, VectorFast.getMultiplication2DScalar(leftAfter, along))
			var alongLeft = VectorFast.getAddition2D(centerPoint, VectorFast.getMultiplication2DScalar(left, along))
			VectorFast.add2D(VectorFast.multiply2DScalar(combinedPoint, along), VectorFast.multiply2DScalar(alongLeft, 1.0 - along))
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
	var fromTo = VectorFast.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = VectorFast.length2D(fromTo)
	var arc = [fromPoint]
	if (fromToLength == 0.0) {
		return removeUnincluded(arc, includeFrom, includeTo)
	}

	angle *= gRadiansPerDegree
	if (Math.abs(angle) < gClose) {
		return [fromPoint, toPoint]
	}

	var fromToRight = VectorFast.multiply2DScalar([-fromTo[1], fromTo[0]], 0.5 / Math.tan(angle * 0.5))
	var center = VectorFast.add2D(Vector.interpolationFromToAlong2D(fromPoint.slice(0), toPoint), fromToRight)
	var centerFrom = VectorFast.getSubtraction2D(fromPoint, center)
	var numberOfArcSides  = Math.ceil(numberOfSides * Math.abs(angle) / gPI2 - gClose)
	arc.length = numberOfArcSides
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		centerFrom.push(0.0)
	}

	var rotator = Vector.polarCounterclockwise(angle / numberOfArcSides)
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		VectorFast.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		arc[pointIndex] = VectorFast.getAdditionArray(center, centerFrom)
	}

	arc.push(toPoint)
	return removeUnincluded(arc, includeFrom, includeTo)
}

