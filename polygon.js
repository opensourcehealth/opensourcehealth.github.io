//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gDifferenceExclusion = {toolExclusion:-1, workExclusion:1, workExclusionSet:new Set([1, 0])}
var gIntersectionExclusion = {toolExclusion:-1, workExclusion:-1, workExclusionSet:new Set([-1])}
var gUnionExclusion = {toolExclusion:1, workExclusion:1, workExclusionSet:new Set([1])}

/* deprecated26
function addEndRectangles(polygons, polyline, size) {
	var halfLength = size[0] * 0.5
	var halfWidth = size[1] * 0.5

	if (polyline.length < 2 || halfLength <= 0.0 || halfWidth <= 0.0) {
		return polyline
	}

	var rectangle = getRectangleCornerParameters(-halfLength, -halfWidth, halfLength, halfWidth)
	var endPoint = polyline[polyline.length - 1]
	var penultimateMinusEnd = VectorFast.getSubtraction2D(polyline[polyline.length - 2], endPoint)
	var penultimateMinusEndLength = VectorFast.length2D(penultimateMinusEnd)
	if (penultimateMinusEndLength > 0.0) {
		VectorFast.divide2DScalar(penultimateMinusEnd, penultimateMinusEndLength)
		polygons.push(Polyline.getAddition2D(Polyline.getRotation2DVector(rectangle, penultimateMinusEnd), endPoint))
	}

	var zeroPoint = polyline[0]
	var secondMinusZero = VectorFast.getSubtraction2D(polyline[1], zeroPoint)
	var secondMinusZeroLength = VectorFast.length2D(secondMinusZero)
	if (secondMinusZeroLength > 0.0) {
		VectorFast.divide2DScalar(secondMinusZero, secondMinusZeroLength)
		polygons.push(Polyline.getAddition2D(Polyline.getRotation2DVector(rectangle, secondMinusZero), zeroPoint))
	}

	return polygons
}
*/

function addIntersectionsToSets(beginSet, endSet, intersections) {
	for (intersectionIndex = 0; intersectionIndex < intersections.length; intersectionIndex += 2) {
		endIntersectionIndex = intersectionIndex + 1
		if (endIntersectionIndex < intersections.length) {
			beginSet.add(intersections[intersectionIndex])
			endSet.add(intersections[endIntersectionIndex])
		}
		else {
			warningByList(['In addIntersectionsToSets intersections length is odd:', intersections.length, intersections])
		}
	}
}

function addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection, y) {
	var xyBeginY = xyBegin[1]
	var xyEndY = xyEnd[1]
	if ((xyBeginY < y) && (xyEndY < y)) {
		return
	}
	if ((xyBeginY > y) && (xyEndY > y)) {
		return
	}
	if ((xyBeginY == y) && (xyEndY == y)) {
		tripleIntersection.centers.push(xyBegin[0])
		tripleIntersection.centers.push(xyEnd[0])
		return
	}
	if (xyBeginY == y) {
		if (xyEndY < y) {
			tripleIntersection.belows.push(xyBegin[0])
		}
		else {
			tripleIntersection.aboves.push(xyBegin[0])
		}
		return
	}
	if (xyEndY == y) {
		if (xyBeginY < y) {
			tripleIntersection.belows.push(xyEnd[0])
		}
		else {
			tripleIntersection.aboves.push(xyEnd[0])
		}
		return
	}
	var deltaY = xyEndY - xyBeginY
	var beginPortion = (xyEndY - y) / deltaY
	var endPortion = (y - xyBeginY) / deltaY
	var x = beginPortion * xyBegin[0] + endPortion * xyEnd[0]
	if ((xyBeginY < y) != (xyEndY < y)) {
		tripleIntersection.belows.push(x)
	}
	if ((xyBeginY > y) != (xyEndY > y)) {
		tripleIntersection.aboves.push(x)
	}
}

function addMeetingsByPolygon(alongIndexesMap, meetingMap, toolPolygon, workPolygon) {
	var xMap = new Map()
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var arrowMap = new Map()
		var toolEndIndex = (toolBeginIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolBeginIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = VectorFast.getSubtraction2D(toolEnd, toolBegin)
		var deltaLength = VectorFast.length2D(delta)
		if (deltaLength != 0.0) {
			VectorFast.divide2DScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = VectorFast.getRotation2DVector(toolBegin, reverseRotation)
			var toolEndRotated = VectorFast.getRotation2DVector(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = Polyline.getRotation2DVector(workPolygon, reverseRotation)
			for (var workBeginIndex = 0; workBeginIndex < workPolygon.length; workBeginIndex++) {
				var workEndIndex = (workBeginIndex + 1) % workPolygon.length
				var meeting = null
				var meetingKey = meetingMap.size.toString()
				var workDirection = true
				var reversedKey = workPolygon[workEndIndex] + ';' + workPolygon[workBeginIndex]
				if (arrowMap.has(reversedKey)) {
					meetingKey = arrowMap.get(reversedKey)
					meeting = meetingMap.get(meetingKey)
					workDirection = false
				}
				else {
					var workBeginRotated = workPolygonRotated[workBeginIndex]
					var workEndRotated = workPolygonRotated[workEndIndex]
					meeting = getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated)
				}
				if (meeting != null) {
					var toolAlong = meeting.toolAlong
					var workAlong = meeting.workAlong
					if (workDirection) {
						if (meeting.isWorkNode) {
							if (meeting.workAlong < 0.5) {
								meeting.point = workPolygon[workBeginIndex]
							}
							else {
								meeting.point = workPolygon[workEndIndex]
							}
						}
						else {
							if (meeting.isToolNode) {
								if (meeting.toolAlong < 0.5) {
									meeting.point = toolBegin
								}
								else {
									meeting.point = toolEnd
								}
								var xKey = meeting.point.toString()
								if (xMap.has(xKey)) {
									meetingKey = xMap.get(xKey)
									meeting = meetingMap.get(meetingKey)
								}
								else {
									xMap.set(xKey, meetingKey)
								}
							}
							else {
								meeting.point = VectorFast.getMultiplicationArrayScalar(workPolygon[workBeginIndex], 1.0 - meeting.workAlong)
								VectorFast.addArray(meeting.point, VectorFast.getMultiplicationArrayScalar(workPolygon[workEndIndex], meeting.workAlong))
							}
						}
						arrowMap.set(workPolygon[workBeginIndex] + ';' + workPolygon[workEndIndex], meetingKey)
						meetingMap.set(meetingKey, meeting)
					}
					else {
						workAlong = 1.0 - workAlong
					}
					addMeetingToMap(
						toolAlong,
						alongIndexesMap,
						meeting.isToolNode,
						't ',
						meetingKey,
						toolBeginIndex,
						toolPolygon.length)
					addMeetingToMap(
						workAlong,
						alongIndexesMap,
						meeting.isWorkNode,
						'w ',
						meetingKey,
						workBeginIndex,
						workPolygon.length)
				}
			}
		}
	}
}

function addMeetingToMap(along, alongIndexesMap, isNode, keyStart, meetingsLength, vertexIndex, polygonLength) {
	if (isNode) {
		if (along < 0.5) {
			MapKit.addElementToMapArray(alongIndexesMap, keyStart + vertexIndex.toString(), [0.0, meetingsLength])
		}
		else {
			MapKit.addElementToMapArray(alongIndexesMap, keyStart + ((vertexIndex + 1) % polygonLength).toString(), [0.0, meetingsLength])
		}
		return
	}

	MapKit.addElementToMapArray(alongIndexesMap, keyStart + vertexIndex.toString(), [along, meetingsLength])
}

function addToPolynodes(key, nodeMap, polynodeMap, polynodes) {
	var connectedPolynode = []
	var newKey = key
	for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
		Vector.pushArray(connectedPolynode, polynodeMap.get(newKey))
		polynodeMap.set(newKey, undefined)
		newKey = nodeMap.get(connectedPolynode[connectedPolynode.length - 1])
		if (newKey == undefined || newKey == key) {
			Vector.removeRepeatsAdd(polynodes, connectedPolynode, 3)
			return
		}
		else {
			connectedPolynode.push(newKey)
		}
		for (var innerWhileCount = 0; innerWhileCount < gLengthLimit; innerWhileCount++) {
			if (newKey == key) {
				Vector.removeRepeatsAdd(polynodes, connectedPolynode, 3)
				return
			}
			if (polynodeMap.get(newKey) == undefined) {
				var newNode = nodeMap.get(newKey)
				if (newNode == undefined) {
					Vector.removeRepeatsAdd(polynodes, connectedPolynode, 3)
					return
				}
				else {
					nodeMap.set(newKey, undefined)
					connectedPolynode.push(newNode)
					newKey = newNode
				}
			}
			else {
				break
			}
		}
	}
}

function addXIntersectionsByPolygon(xIntersections, xyPolygon, y) {
	for (var pointIndex = 0; pointIndex < xyPolygon.length; pointIndex++) {
		Polyline.addXIntersectionsBySegment(xyPolygon[pointIndex], xyPolygon[(pointIndex + 1) % xyPolygon.length], xIntersections, y)
	}
}

function convert2DPolygonsTo3D(xyPolygons, z) {
	for (var polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		xyPolygons[polygonIndex] = getPolygon3D(xyPolygons[polygonIndex], z)
	}

	return xyPolygons
}

function convertFacetsToPolygons(facets) {
	for (var facet of facets) {
		convertFacetsToPolygon(facet)
	}

	return facets
}

function convertFacetsToPolygon(facets) {
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		facets[facetIndex] = facets[facetIndex].split(',').map(parseFloat)
	}

	return facets
}

var Difference = {
addIntersectionArc: function(arcObject, centerPoint, differenceCircle, isCounterclockwise, radius, numberOfSides, vertexIndex) {
	var arc = arcObject.arc
	if (arc.length == 0) {
		return
	}

	if (arc.length == 1) {
		Vector.spliceArray(differenceCircle, vertexIndex, arc)
		return
	}

	var beginPoint = arc[0]
	var centerBegin = VectorFast.getSubtraction2D(beginPoint, centerPoint)
	var centerBeginLength = VectorFast.length2D(centerBegin)
	if (centerBeginLength == 0.0) {
		Vector.spliceArray(differenceCircle, vertexIndex, arc)
		return
	}

	VectorFast.divide2DScalar(centerBegin, centerBeginLength)
	var beginAngle = Math.atan2(centerBegin[1], centerBegin[0])
	var endPoint = arc[1]
	var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = VectorFast.length2D(centerEnd)
	if (centerEndLength == 0.0) {
		Vector.spliceArray(differenceCircle, vertexIndex, arc)
		return
	}

	VectorFast.divide2DScalar(centerEnd, centerEndLength)
	var beginAngle = Math.atan2(centerBegin[1], centerBegin[0])
	var endAngle = Math.atan2(centerEnd[1], centerEnd[0])
	var angleDifference = (gPI2 + beginAngle - endAngle) % gPI2
	if (isCounterclockwise) {
		angleDifference = -angleDifference
	}

	var toZ = undefined
	if (endPoint.length > 2 && beginPoint.length > 2) {
		toZ = endPoint[2]
		centerPoint.length = 3
		centerPoint[2] = beginPoint[2]
	}

	var arc = getSpiralCenterRadiusDifference(centerPoint, radius, angleDifference, beginAngle, numberOfSides, toZ, false, false)
	arc.splice(0, 0, beginPoint)
	arc.push(endPoint)
	var outsidePoints = arcObject.outsidePoints
	var includeFrom = VectorFast.distanceSquared2D(beginPoint, outsidePoints[0]) > gCloseSquared
	var includeTo = VectorFast.distanceSquared2D(endPoint, outsidePoints[outsidePoints.length - 1]) > gCloseSquared 
	Vector.spliceArray(differenceCircle, vertexIndex, removeUnincluded(arc, includeFrom, includeTo))
},

addIntersectionPoint: function(arcObject, beginPoint, centerPoint, endPoint, radius) {
	var beginEnd = VectorFast.getSubtraction2D(endPoint, beginPoint)
	var beginEndLength = VectorFast.length2D(beginEnd)
	if (beginEndLength == 0.0) {
		return
	}

	VectorFast.divide2DScalar(beginEnd, beginEndLength)
	var reverseRotation = [beginEnd[0], -beginEnd[1]]
	var beginRotated = VectorFast.getRotation2DVector(beginPoint, reverseRotation)
	var centerRotated = VectorFast.getRotation2DVector(centerPoint, reverseRotation)
	var endXRotated = endPoint[0] * reverseRotation[0] - endPoint[1] * reverseRotation[1]
	var y = beginRotated[1]
	var deltaY = centerRotated[1] - y
	var deltaX = Math.sqrt(radius * radius - deltaY * deltaY)
	var intersections = [centerRotated[0] - deltaX, centerRotated[0] + deltaX]
	var intersectionPoint = undefined
	var minimumDifference = Number.MAX_VALUE
	for (var intersection of intersections) {
		var intersectionDifference = intersection - beginRotated[0]
		if (intersectionDifference > 0.0 && intersection < endXRotated && intersectionDifference < minimumDifference) {
			minimumDifference = intersectionDifference
			intersectionPoint = [intersection, y]
			if (beginPoint.length > 2 && endPoint.length > 2) {
				var along = intersectionDifference / (endXRotated - beginRotated[0])
				intersectionPoint.push((1.0 - along) * beginPoint[2] + along * endPoint[2])
			}
		}
	}

	if (intersectionPoint != undefined) {
		arcObject.arc.push(VectorFast.rotate2DVector(intersectionPoint, beginEnd))
		arcObject.outsidePoints.push(beginPoint)
	}
}
}

function directPolygonGroup(polygonGroup) {
	if (polygonGroup.length < 2) {
		return
	}

	var isClockwise = Polygon.isClockwise(polygonGroup[0])
	for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
		if (Polygon.isClockwise(polygonGroup[polygonIndex]) == isClockwise) {
			polygonGroup[polygonIndex].reverse()
		}
	}
}

function getArcFromAngleToAngle(fromPoint, fromAngle, toPoint, toAngle, numberOfSides, inset) {
	var arc = [fromPoint]
	var fromDifferenceVector = getCenterDifferenceVector(fromPoint, fromAngle, toPoint)
	if (fromDifferenceVector == undefined) {
		return arc
	}

	var toDifferenceVector = getCenterDifferenceVector(toPoint, toAngle, fromPoint)
	var numberOfArcSides = Math.max(Math.abs(fromDifferenceVector.difference), Math.abs(toDifferenceVector.difference))
	numberOfArcSides = Math.ceil(numberOfSides * numberOfArcSides / gPI2 - gClose)
	var fromArc = getArcFromAngleToArcSides(fromPoint, fromAngle, toPoint, numberOfArcSides, inset)
	var toArc = getArcFromAngleToArcSides(toPoint, toAngle, fromPoint, numberOfArcSides, inset).reverse()
	return Vector.getMeldedArray(fromArc, toArc)
}

function getArcFromAngleToArcSides(fromPoint, fromAngle, toPoint, numberOfArcSides, inset = 0.0) {
	var originalFrom = fromPoint
	var originalTo = toPoint
	if (inset != 0.0) {
		var fromTo = Vector.normalize2D(VectorFast.getSubtraction2D(toPoint, fromPoint))
		var fromToRight = [fromTo[1], -fromTo[0]]
		var fromInset = Vector.polarRadius(fromAngle, inset)
		fromPoint = VectorFast.getAddition2D(fromPoint, fromInset)
		var dotFromTo = VectorFast.dotProduct2D(fromTo, fromInset)
		var dotFromRight = VectorFast.dotProduct2D(fromToRight, fromInset)
		var toInset = VectorFast.multiply2DScalar(fromTo, -dotFromTo)
		VectorFast.add2D(toInset, VectorFast.multiply2DScalar(fromToRight, dotFromRight))
		toPoint = VectorFast.getAddition2D(toPoint, toInset)
	}

	var centerDifferenceVector = getCenterDifferenceVector(fromPoint, fromAngle, toPoint)
	var arc = [fromPoint]
	if (centerDifferenceVector == undefined) {
		return arc
	}

	var rotator = Vector.polarCounterclockwise(centerDifferenceVector.difference / numberOfArcSides)
	arc.length = 1 + numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		VectorFast.rotate2DVector(centerDifferenceVector.vector, rotator)
		arc[pointIndex] = VectorFast.getAdditionArray(centerDifferenceVector.center, centerDifferenceVector.vector)
	}

	arc[0] = originalFrom
	arc[numberOfArcSides] = originalTo
	return arc
}

function getAxesByNormal(normal) {
	var axes = [1, 2]
	var greatestProduct = normal[0]
	if (Math.abs(normal[1]) > Math.abs(greatestProduct)) {
		greatestProduct = normal[1]
		axes = [2, 0]
	}
	if (Math.abs(normal[2]) > Math.abs(greatestProduct)) {
		greatestProduct = normal[2]
		axes = [0, 1]
	}
	if (greatestProduct < 0.0) {
		swap2DPoint(axes)
	}
	return axes
}

function getBoundingBox(points) {
	if (Vector.isEmpty(points)) {
		return undefined
	}

	var boundingBox = [points[0].slice(0, 2), points[0].slice(0, 2)]
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		widenBoundingBox(boundingBox, points[pointIndex])
	}

	return boundingBox
}

function getBoundingXByPolygons(polygons) {
	if (Vector.isEmpty(polygons)) {
		return undefined
	}
	var polygonZero = polygons[0]
	if (Vector.isEmpty(polygonZero)) {
		return undefined
	}
	var x = polygonZero[0][0]
	var boundingX = [x, x]
	for (var polygon of polygons) {
		for (var point of polygon) {
			x = point[0]
			boundingX[0] = Math.min(boundingX[0], x)
			boundingX[1] = Math.max(boundingX[1], x)
		}
	}
	return boundingX
}

function getBoundingSegment(points, dimension = 0) {
	if (Vector.isEmpty(points)) {
		return undefined
	}

	var boundingSegment = [points[0][dimension], points[0][dimension]]
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		boundingSegment[0] = Math.min(boundingSegment[0], points[pointIndex][dimension])
		boundingSegment[1] = Math.max(boundingSegment[1], points[pointIndex][dimension])
	}

	return boundingSegment
}

function getCenterDifferenceVector(fromPoint, fromAngle, toPoint) {
	var fromTo = VectorFast.subtract2D(toPoint.slice(0), fromPoint)
	var fromToLength = VectorFast.length2D(fromTo)
	if (fromToLength == 0.0) {
		return undefined
	}

	VectorFast.divide2DScalar(fromTo, fromToLength)
	var fromVector = Vector.polarCounterclockwise(fromAngle)
	var crossTo = VectorFast.crossProduct2D(fromVector, fromTo)
	var dotTo = VectorFast.dotProduct2D(fromVector, fromTo)
	var fromToRight = VectorFast.multiply2DScalar([-fromTo[1], fromTo[0]], 0.5 * fromToLength * dotTo / crossTo)
	var center = VectorFast.add2D(Vector.interpolationFromToAlong2D(fromPoint, toPoint), fromToRight)
	return {center:center, difference:Math.atan2(crossTo, dotTo) * 2.0, vector:VectorFast.getSubtraction2D(fromPoint, center)}
}

function getClosestDistanceToIntersection(x, xIntersections) {
	var closestDistance = Number.MAX_VALUE
	for (var xIntersection of xIntersections) {
		var distance = Math.abs(xIntersection - x)
		if (distance < closestDistance) {
			closestDistance = distance
		}
	}
	return closestDistance
}

function getClosestPoint(gridMap, gridMultiplier, point) {
	var floorX = Math.floor(point[0] * gridMultiplier)
	var floorY = Math.floor(point[1] * gridMultiplier)
	var ceilingX = floorX + 1
	var ceilingY = floorY + 1
	var closestSquared = [undefined, undefined]
	setClosestSquaredByXY(closestSquared, gridMap, floorX, floorY, point)
	setClosestSquaredByXY(closestSquared, gridMap, floorX, ceilingY, point)
	setClosestSquaredByXY(closestSquared, gridMap, ceilingX, floorY, point)
	setClosestSquaredByXY(closestSquared, gridMap, ceilingX, ceilingY, point)
	if (closestSquared[0] != undefined) {
		return closestSquared[0]
	}
	for (var outward = 0;; outward++) {
		var outwardPlus = outward + outward + 4
		if (outwardPlus * outwardPlus > gridMap.size || outward > gLengthLimitRoot) {
			for (var key of gridMap.keys()) {
				setClosestSquared(closestSquared, gridMap, key, point)
			}
			return closestSquared[0]
		}
		floorX -= 1
		floorY -= 1
		ceilingX += 1
		ceilingY += 1
		var y = floorY
		for (var x = floorX; x < ceilingX; x++) {
			setClosestSquaredByXY(closestSquared, gridMap, x, floorY, point)
			setClosestSquaredByXY(closestSquared, gridMap, x + 1, ceilingY, point)
			setClosestSquaredByXY(closestSquared, gridMap, floorX, y + 1, point)
			setClosestSquaredByXY(closestSquared, gridMap, ceilingX, y, point)
			y += 1
		}
		if (closestSquared[0] != undefined) {
			return closestSquared[0]
		}
	}
}

//deprecated23 should be replaced by getClosePointIndexOrNull followed by addPointIndexToGridMapArray if null
function getClosePointIndex(gridMap, point, points) {
	var floorX = Math.floor(point[0] * gHalfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * gHalfMinusOver)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				return gridMap.get(key)
			}
		}
	}
	var pointsLength = points.length
	gridMap.set(Math.round(point[0] * gHalfMinusOver).toString() + ' ' + Math.round(point[1] * gHalfMinusOver).toString(), pointsLength)
	points.push(point)
	return pointsLength
}

function getClosePointIndexOrNull(gridMap, point, points) {
	var floorX = Math.floor(point[0] * gHalfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * gHalfMinusOver)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				var closestIndex = pointIndexes[0]
				if (pointIndexes.length == 1) {
					return closestIndex
				}
				var leastDistanceSquared = VectorFast.distanceSquared2D(point, points[pointIndexes[0]])
				for (var pointIndexIndex = 1; pointIndexIndex < pointIndexes.length; pointIndexIndex++) {
					var pointIndex = pointIndexes[pointIndexIndex]
					var distanceSquared = VectorFast.distanceSquared2D(point, points[pointIndex])
					if (distanceSquared < leastDistanceSquared) {
						closestIndex = pointIndex
						leastDistanceSquared = distanceSquared
					}
				}
				return closestIndex
			}
		}
	}
	return undefined
}

function getClosestPointIndex(point, points) {
	var closestPointIndex = undefined
	var closestDistanceSquared = Number.MAX_VALUE
	for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
		var distanceSquared = VectorFast.distanceSquared2D(point, points[vertexIndex])
		if (distanceSquared < closestDistanceSquared) {
			closestPointIndex = vertexIndex
			closestDistanceSquared = distanceSquared
		}
	}

	return closestPointIndex
}

// deprecated25
/*
function getConnectedSegmentArrays(toolPolygonSegments, workPolygonSegments) {
	if (workPolygonSegments.length < 3) {
		return []
	}

	var startIndex = Vector.getStartIndex(workPolygonSegments)
	if (startIndex == undefined) {
		if (workPolygonSegments[0] == null) {
			return []
		}
		return [workPolygonSegments]
	}

	var segmentArrays = getSegmentArrays(workPolygonSegments, startIndex)
	var toolNodeMap = new Map()
	for (var segmentIndex = 0; segmentIndex < toolPolygonSegments.length; segmentIndex++) {
		var toolPolygonSegment = toolPolygonSegments[segmentIndex]
		if (toolPolygonSegment != null) {
			toolNodeMap.set(toolPolygonSegment[0].nodeKey, segmentIndex)
		}
	}

	var endMap = new Map()
	for (var segmentIndex = 0; segmentIndex < segmentArrays.length; segmentIndex++) {
		endMap.set(segmentArrays[segmentIndex][0][0].nodeKey, segmentIndex)
	}

	var workSegmentArrays = []
	for (var segmentIndex = 0; segmentIndex < segmentArrays.length; segmentIndex++) {
		var segments = segmentArrays[segmentIndex]
		var nodeBeginKey = segments[segments.length - 1][1].nodeKey
		connectionSegments = getConnectionSegments(endMap, nodeBeginKey, toolNodeMap, toolPolygonSegments)
		if (connectionSegments != null) {
			segmentArrays[segmentIndex] = null
			var nodeEndKey = segments[0][0].nodeKey
			Vector.pushArray(segments, connectionSegments.segments)
			if (connectionSegments.nodeKey == segmentIndex) {
				workSegmentArrays.push(segments)
				if (segments.length < 3) {
//					printCaller(
//					['segments is shorter than 3 in getConnectedSegmentArrays in polygon.', segments, segmentArrays, segmentIndex])
				}
				endMap.delete(nodeEndKey)
			}
			else {
				Vector.pushArray(segments, segmentArrays[connectionSegments.nodeKey])
				segmentArrays[connectionSegments.nodeKey] = segments
				endMap.set(nodeEndKey, connectionSegments.nodeKey)
			}
		}
	}

	for (var segments of segmentArrays) {
		if (segments != null) {
			printCaller(['segments are not null in getConnectedSegmentArrays in polygon.', segments, segmentArrays])
			workSegmentArrays.push(segments)
		}
	}

	return workSegmentArrays
}

function getConnectionSegments(endMap, nodeBeginKey, toolNodeMap, toolPolygonSegments) {
	if (!toolNodeMap.has(nodeBeginKey)) {
		return null
	}

	var connectionSegments = []
	var startIndex = toolNodeMap.get(nodeBeginKey)
	for (var extraIndex = 0; extraIndex < toolPolygonSegments.length; extraIndex++) {
		var segmentIndex = (startIndex + extraIndex) % toolPolygonSegments.length
		var toolPolygonSegment = toolPolygonSegments[segmentIndex]
		if (toolPolygonSegment == null) {
			return null
		}
		connectionSegments.push(toolPolygonSegment)
		var toolKey = toolPolygonSegment[1].nodeKey
		if (endMap.has(toolKey)) {
			return {nodeKey:endMap.get(toolKey), segments:connectionSegments}
		}
	}

	return null
}
*/

function getCrossProductByPolygon(polygon) {
	removeIdentical3DPoints(polygon)
	var product = [0.0, 0.0, 0.0]
	if (polygon.length < 3) {
		return product
	}

	var center = polygon[0]
	var oldVector = VectorFast.getSubtraction3D(polygon[1], center)
	for (var vertexIndex = 2; vertexIndex < polygon.length; vertexIndex++) {
		var vector = VectorFast.getSubtraction3D(polygon[vertexIndex], center)
		VectorFast.add3D(product, VectorFast.crossProduct(oldVector, vector))
		oldVector = vector
	}

	return product
}

function getDifferencePolygonsByPolygons(workPolygons, toolPolygons) {
	for (var toolPolygon of toolPolygons) {
		var differencePolygons = []
		for (var workPolygon of workPolygons) {
			Vector.pushArray(differencePolygons, Polygon.getDifferencePolygons(workPolygon, toolPolygon))
		}
		workPolygons = differencePolygons
	}

	return workPolygons
}

function getDirectedPolygon(clockwise, polygon) {
	if (Polygon.isClockwise(polygon) == clockwise) {
		return polygon
	}

	return polygon.slice(0).reverse()
}

function getDistanceToLine(begin, end, point) {
	var delta = VectorFast.getSubtraction2D(end, begin)
	var deltaLength = VectorFast.length2D(delta)
	if (deltaLength == 0.0) {
		return VectorFast.distance2D(begin, point)
	}

	VectorFast.divide2DScalar(delta, deltaLength)
	return Math.abs(point[1] * delta[0] - point[0] * delta[1] - begin[1] * delta[0] + begin[0] * delta[1])
}

function getDistanceToLineSegment(begin, end, point) {
	var delta = VectorFast.getSubtraction2D(end, begin)
	var deltaLength = VectorFast.length2D(delta)
	if (deltaLength == 0.0) {
		return VectorFast.distance2D(begin, point)
	}

	VectorFast.divide2DScalar(delta, deltaLength)
	delta[1] = -delta[1]
	var rotatedBegin = VectorFast.getRotation2DVector(begin, delta)
	var rotatedPoint = VectorFast.getRotation2DVector(point, delta)
	if (rotatedPoint[0] < rotatedBegin[0]) {
		return VectorFast.distance2D(begin, point)
	}

	if (rotatedPoint[0] > end[0] * delta[0] - end[1] * delta[1]) {
		return VectorFast.distance2D(end, point)
	}

	return Math.abs(rotatedPoint[1] - rotatedBegin[1])
}

function getDouble3DPolygonArea(polygon) {
	var polygonArea = 0.0
	var center = polygon[0]
	for (var pointIndex = 0; pointIndex < polygon.length - 2; pointIndex++) {
		var begin = polygon[(pointIndex + 1) % polygon.length]
		var end = polygon[(pointIndex + 2) % polygon.length]
		polygonArea += VectorFast.length3D(VectorFast.crossProduct(VectorFast.getSubtraction3D(begin, center), VectorFast.getSubtraction3D(end, center)))
	}

	return polygonArea
}

function getDoublePolygonArea(polygon) {
	var polygonArea = 0.0
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		var nextPoint = polygon[(pointIndex + 1) % polygon.length]
		polygonArea += polygon[pointIndex][0] * nextPoint[1] - polygon[pointIndex][1] * nextPoint[0]
	}

	return polygonArea
}

function getDoublePolygonsArea(polygons) {
	var polygonsArea = 0.0
	for (var polygon of polygons) {
		polygonsArea += getDoublePolygonArea(polygon)
	}

	return polygonsArea
}

function getDoubleTriangleArea(a, b, c) {
	var aX = a[0]
	var aY = a[1]
	return (b[0] - aX) * (aY - c[1]) + (b[1] - aY) * (c[0] - aX)
}

function getExtantPolygons(alongIndexesMap, exclusion, isVertical, meetingMap, toolPolygon, workPolygon) {
	var toolSegments = getPolygonSegments(alongIndexesMap, meetingMap, toolPolygon, 't')
	var workSegments = getPolygonSegments(alongIndexesMap, meetingMap, workPolygon, 'w')
	for (var segmentIndex = toolSegments.length - 1; segmentIndex > -1; segmentIndex--) {
		var toolSegment = toolSegments[segmentIndex]
		if (toolSegment[0].nodeKey == toolSegment[1].nodeKey) {
			toolSegments.splice(segmentIndex, 1)
		}
	}

	if (isVertical) {
		for (var segmentIndex = toolSegments.length - 1; segmentIndex > -1; segmentIndex--) {
			var toolSegment = toolSegments[segmentIndex]
			var nodeBegin = toolSegment[0]
			var nodeEnd = toolSegment[1]
			if (nodeBegin.nodeKey[0] == 'm' && nodeEnd.nodeKey[0] == 'm') {
				if (nodeBegin.nodeKey != nodeEnd.nodeKey) {
					if (VectorFast.equal2D(nodeBegin.point, nodeEnd.point[1])) {
						var reversedSegment = [toolSegment[1], toolSegment[0]]
						toolSegments.splice(segmentIndex + 1, 0, reversedSegment)
					}
				}
			}
		}
	}
	nullifyExcludedPoints(exclusion.toolExclusion, workPolygon, toolSegments)
	nullifyExcludedMidpoints(new Set([exclusion.toolExclusion]), workPolygon, toolSegments)
	nullifyExcludedPoints(exclusion.workExclusion, toolPolygon, workSegments)
	nullifyExcludedMidpoints(exclusion.workExclusionSet, toolPolygon, workSegments)
	return getPolynodes(toolSegments, workSegments)
}

function getFacetsByArrowKeyMap(arrowKeyMap) {
	var facets = []
	for (var arrow of arrowKeyMap.values()) {
		if (arrow != null) {
			var arrowString = arrow.beginKey.toString() + ' ' + arrow.endKey.toString()
			var facet = [arrow.beginKey]
			arrowKeyMap.set(arrowString, null)
			do {
				if (arrowKeyMap.has(arrow.endKey)) {
					var nextArrow = arrowKeyMap.get(arrow.endKey)
					if (nextArrow == null) {
//						warningString = 'In getFacetsByarrowKeyMap, arrow.endKey:\n was null in the arrowKeyMap:\n from the facet:\n'
//						warning(warningString, [arrow, arrowKeyMap, facet])
						break
					}
					else {
						arrow = nextArrow
						arrowKeyMap.set(arrow.beginKey, null)
						facet.push(arrow.beginKey)
					}
				}
				else {
//					warningString = 'In getFacetsByarrowKeyMap, arrow.endKey:\n was not in the arrowKeyMap:\n from the facet:\n'
//					warning(warningString, [arrow, arrowKeyMap, facet])
					break
				}
				if (facet[0] == arrow.endKey) {
					facets.push(facet)
					break
				}
				if (facet.length > gLengthLimit) {
//					warningString = 'In getFacetsByarrowKeyMap, polygon is too large or there is a mistake, length: \narrowKey: \nfacet: '
//					warning(warningString, [facet.length, arrow, facet])
					break
				}
			}
			while (true)
		}
	}
	return facets
}

function getGridMultiplier(gridMap, points) {
	if (Vector.isEmpty(points)) {
		return undefined
	}
	var firstPoint = points[0]
	var minimumX = firstPoint[0]
	var maximumX = firstPoint[0]
	var minimumY = firstPoint[1]
	var maximumY = firstPoint[1]
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var minimumX = Math.min(minimumX, point[0])
		var maximumX = Math.max(maximumX, point[0])
		var minimumY = Math.min(minimumY, point[1])
		var maximumY = Math.max(maximumY, point[1])
	}
	var maximumRange = Math.max(maximumX - minimumX, maximumY - minimumY)
	var gridMultiplier = 2.0 * (Math.sqrt(points.length) + 1) / maximumRange
	for (var point of points) {
		var key = Math.round(point[0] * gridMultiplier).toString() + ' ' + Math.round(point[1] * gridMultiplier).toString()
		MapKit.addElementToMapArray(gridMap, key, point)
	}
	return gridMultiplier
}

function getHolePolygons(innerLeft, innerRight, outerBottom, outerTopRight, overhangAngle, thickness, width) {
	var deltaZMinus = outerTopRight[1] - thickness - outerBottom
	var minimumQuadrilateralExtra = 0.5 * thickness
	var minimumPolygonExtra = minimumQuadrilateralExtra - 0.5 * thickness
	var innerWidth = innerRight - innerLeft
	var innerWidthPlus = innerWidth + thickness
	var minimumPolygonLength = 0
	var numberOfHorizontals = 1
	var numberOfVerticals = 1
	if (width < innerWidth) {
		numberOfHorizontals = Math.ceil(innerWidthPlus / width)
	}
	var diamondWidth = innerWidthPlus / numberOfHorizontals
	var diamondInnerWidth = diamondWidth - thickness
	var holePolygons = []
	var slope = Math.cos(overhangAngle) / Math.sin(overhangAngle)
	var diamondInnerHeight = diamondInnerWidth * slope
	var diamondHeight = diamondInnerHeight + thickness
	if (diamondHeight > deltaZMinus) {
		diamondHeight = deltaZMinus
		diamondInnerHeight = diamondHeight - thickness
		numberOfHorizontals = Math.ceil(innerWidthPlus / (diamondInnerHeight / slope + thickness))
		diamondWidth = innerWidthPlus / numberOfHorizontals
		diamondInnerWidth = diamondWidth - thickness
	}
	else {
		numberOfVerticals = Math.floor(deltaZMinus / diamondHeight)
		diamondHeight = deltaZMinus / numberOfVerticals
		diamondInnerHeight = diamondHeight - thickness
	}
	var minimumSize = 0.1 * thickness
	if (diamondInnerHeight < minimumSize || diamondInnerWidth < minimumSize) {
		return []
	}
	var hypoteneuse = thickness * Math.sqrt(diamondInnerWidth * diamondInnerWidth + diamondInnerHeight * diamondInnerHeight)
	var thicknessX = hypoteneuse / diamondInnerHeight
	var thicknessZ = hypoteneuse / diamondInnerWidth
	var diamondBottom = outerBottom + thickness
	var diamondTop = diamondBottom + diamondInnerHeight
	var diamondCenterZ = 0.5 * (diamondBottom + diamondTop)
	var startRight = innerLeft + diamondInnerWidth
	var startCenterX = 0.5 * (innerLeft + startRight)
	for (var verticalIndex = 0; verticalIndex < numberOfVerticals; verticalIndex++) {
		var diamondLeft = innerLeft
		var diamondRight = startRight
		var diamondCenterX = startCenterX
		var polygonTop = diamondCenterZ - thicknessZ
		var polygonExtra = polygonTop - diamondBottom
		minimumPolygonLength = Math.max(minimumPolygonLength, 5 * (polygonExtra < minimumQuadrilateralExtra))
		minimumPolygonLength = Math.max(minimumPolygonLength, 9 * (polygonExtra < minimumPolygonExtra))
		var polygonBelow = diamondBottom - thickness
		var polygonBottom = diamondBottom + diamondBottom - polygonTop - thickness
		var rightSide = undefined
		for (var horizontalIndex = 0; horizontalIndex < numberOfHorizontals; horizontalIndex++) {
			var diamondHole = [
			[diamondLeft, diamondCenterZ], [diamondCenterX, diamondTop], [diamondRight, diamondCenterZ], [diamondCenterX, diamondBottom]]
			holePolygons.push(diamondHole)
			var polygonLeft = diamondCenterX + thicknessX
			var polygonRight = diamondCenterX - thicknessX
			var polygonExtra = polygonRight - diamondLeft
			minimumPolygonLength = Math.max(minimumPolygonLength, 5 * (polygonExtra < minimumQuadrilateralExtra))
			minimumPolygonLength = Math.max(minimumPolygonLength, 9 * (polygonExtra < minimumPolygonExtra))
			var leftSide = [[diamondLeft, polygonTop], [polygonRight, diamondBottom]]
			if (verticalIndex == 0) {
				if (rightSide == undefined) {
					leftSide.push([diamondLeft, diamondBottom])
				}
				else {
					Vector.pushArray(leftSide, rightSide)
				}
				rightSide = [[polygonLeft, diamondBottom], [diamondRight, polygonTop]]
			}
			else {
				leftSide.push([polygonRight, polygonBelow])
				leftSide.push([diamondLeft, polygonBottom])
				if (rightSide != null) {
					Vector.pushArray(leftSide, rightSide)
				}
				rightSide = [
				[diamondRight, polygonBottom], [polygonLeft, polygonBelow], [polygonLeft, diamondBottom], [diamondRight, polygonTop]]
			}
			if (leftSide.length > minimumPolygonLength) {
				holePolygons.push(leftSide)
			}
			diamondCenterX += diamondWidth
			diamondLeft += diamondWidth
			diamondRight += diamondWidth
		}
		if (verticalIndex == 0) {
			rightSide.push([diamondRight - diamondWidth, diamondBottom])
		}
		if (rightSide.length > minimumPolygonLength) {
			holePolygons.push(rightSide)
		}
		diamondBottom += diamondHeight
		diamondCenterZ += diamondHeight
		diamondTop += diamondHeight
	}
	return holePolygons
}

function getIndexRange(elements, index) {
	if (elements.length == 0) {
		return undefined
	}
	var minimum = elements[0][index]
	var minimumIndex = 0
	var maximum = elements[0][index]
	var maximumIndex = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var elementValue = elements[elementIndex][index]
		if (elementValue < minimum) {
			minimum = elementValue
			minimumIndex = elementIndex
		}
		else {
			if (elementValue > maximum) {
				maximum = elementValue
				maximumIndex = elementIndex
			}
		}
	}
	return [minimumIndex, maximumIndex]
}

function getInsetDelta(centerBegin, centerEnd) {
	var insetDelta = VectorFast.getAddition2D(centerBegin, centerEnd)
	var endRight = [centerEnd[1], -centerEnd[0]]
	var dotProductPerpendicular = VectorFast.dotProduct2D(endRight, insetDelta)
	if (dotProductPerpendicular == 0.0) {
		return endRight
	}
	return VectorFast.divide2DScalar(insetDelta, dotProductPerpendicular)
}

function getIntercircleLoops(points, radius, removalStart) {
	removeClose2DPoints(points)
	var bigMap = new Map()
	var bigRadius = 1.5 * radius
	var centers = []
	var centerSet = new Set()
	var diameter = radius + radius
	var diameterMap = new Map()
	var diameterSquared = diameter * diameter
	var distantIndexes = []
	var gridMap = new Map()
	var intercircles = new Array(points.length)
	var intercircleLoops = []
	var linkSet = new Set()
	var radiusSquared = radius * radius
	var bigRadiusSquared = bigRadius * bigRadius
	var minusOverBig = 0.499 / bigRadius
	var minusOverDiameter = 0.499 / diameter
	var minusOverRadius = 0.499 / radius
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		Polyline.addPointIndexToGridMap(bigMap, minusOverBig, point, pointIndex)
		Polyline.addPointIndexToGridMap(gridMap, minusOverRadius, point, pointIndex)
	}

	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var otherIndexes = getPointIndexesInCircle(diameterMap, minusOverDiameter, point, points, diameterSquared)
		Polyline.addPointIndexToGridMap(diameterMap, minusOverDiameter, point, pointIndex)
		for (var otherIndex of otherIndexes) {
			var other = points[otherIndex]
			var distanceSquared = VectorFast.distanceSquared2D(point, other)
			var pointOther = VectorFast.getSubtraction2D(point, other)
			var pointOtherLength = Math.sqrt(distanceSquared)
			var leftLength = Math.sqrt(radiusSquared - 0.25 * distanceSquared)
			var furtherLength = Math.sqrt(bigRadiusSquared - 0.25 * distanceSquared)
			var between = VectorFast.multiply2DScalar(VectorFast.getAddition2D(point, other), 0.5)
			var left = [-pointOther[1], pointOther[0]]
			var centerPoint = VectorFast.getAddition2D(between, VectorFast.getMultiplication2DScalar(left, leftLength / pointOtherLength))
			linkSet.clear()
			linkSet.add(pointIndex)
			linkSet.add(otherIndex)
			if (isPointOutsideOrBorderingCircles(gridMap, minusOverRadius, linkSet, centerPoint, points, radiusSquared)) {
				var difference = VectorFast.getSubtraction2D(centerPoint, point)
				Vector.addElementToArrays(intercircles, pointIndex, [Vector.getRelativeDirection(difference), centers.length])
				difference = VectorFast.getSubtraction2D(centerPoint, other)
				Vector.addElementToArrays(intercircles, otherIndex, [Vector.getRelativeDirection(difference), centers.length])
				var further = VectorFast.getAddition2D(between, VectorFast.getMultiplication2DScalar(left, furtherLength / pointOtherLength))
				if (isPointOutsideOrBorderingCircles(bigMap, minusOverBig, linkSet, further, points, bigRadiusSquared)) {
					distantIndexes.push(centers.length)
				}
				centers.push(otherIndex)
			}
			centerPoint = VectorFast.getAddition2D(between, VectorFast.getMultiplication2DScalar(left, -leftLength / pointOtherLength))
			if (isPointOutsideOrBorderingCircles(gridMap, minusOverRadius, linkSet, centerPoint, points, radiusSquared)) {
				var difference = VectorFast.getSubtraction2D(centerPoint, point)
				Vector.addElementToArrays(intercircles, pointIndex, [Vector.getRelativeDirection(difference), centers.length])
				difference = VectorFast.getSubtraction2D(centerPoint, other)
				Vector.addElementToArrays(intercircles, otherIndex, [Vector.getRelativeDirection(difference), centers.length])
				var further = VectorFast.getAddition2D(between, VectorFast.getMultiplication2DScalar(left, -furtherLength / pointOtherLength))
				if (isPointOutsideOrBorderingCircles(bigMap, minusOverBig, linkSet, further, points, bigRadiusSquared)) {
					distantIndexes.push(centers.length)
				}
				centers.push(pointIndex)
			}
		}
	}

	for (var intercircleIndex = 0; intercircleIndex < intercircles.length; intercircleIndex++) {
		var intercircle = intercircles[intercircleIndex]
		if (intercircle != undefined) {
			intercircle.sort(Vector.compareElementZeroDescending)
			for (var linkIndex = 0; linkIndex < intercircle.length; linkIndex++) {
				intercircle[linkIndex] = intercircle[linkIndex][1]
			}
		}
	}

	for (var distantIndex of distantIndexes) {
		if (!centerSet.has(distantIndex)) {
			var intercircleLoop = []
			var nextIndex = distantIndex
			do {
				var intercircleIndex = centers[nextIndex]
				var intercircle = intercircles[intercircleIndex]
				centerSet.add(nextIndex)
				intercircleLoop.push(intercircleIndex)
				for (var linkIndex = 0; linkIndex < intercircle.length; linkIndex++) {
					if (intercircle[linkIndex] == nextIndex) {
						nextIndex = intercircle[(linkIndex + 1) % intercircle.length]
						break
					}
				}
			}
			while (!centerSet.has(nextIndex))
			if (intercircleLoop.length > 1) {
				removeConvertCollinearXYPointIndexes(intercircleLoop, points, removalStart)
				if (intercircleLoop.length > 0) {
					intercircleLoops.push(intercircleLoop)
				}
			}
		}
	}

	return intercircleLoops
}

function getIntercircleLoopsByPolylines(polylines, radius) {
	var points = []
	for (var polyline of polylines) {
		for (var vertexIndex = 0; vertexIndex < polyline.length - 1; vertexIndex++) {
			points.push(polyline[vertexIndex])
		}
		if (polyline.length > 1) {
			if (!VectorFast.equal2D(polyline[0], polyline[polyline.length - 1])) {
				points.push(polyline[vertexIndex])
			}
		}
	}

	var removalStart = points.length
	for (var polyline of polylines) {
		// starting at 1 because polygon is a polyline with the beginning point added to the end
		for (var vertexIndex = 1; vertexIndex < polyline.length; vertexIndex++) {
			var vertex = polyline[vertexIndex - 1]
			var vertexNext = VectorFast.getSubtraction2D(polyline[vertexIndex], vertex)
			var vertexNextLength = VectorFast.length2D(vertexNext)
			if (vertexNextLength > radius) {
				var numberOfDivisions = Math.ceil(vertexNextLength / radius)
				vertex = vertex.slice(0)
				VectorFast.divide2DScalar(vertexNext, numberOfDivisions)
				for (var betweenIndex = 1; betweenIndex < numberOfDivisions; betweenIndex++) {
					VectorFast.add2D(vertex, vertexNext)
					points.push(vertex.slice(0))
				}
			}
		}
	}

	return getIntercircleLoops(points, radius, removalStart)
}

function getIntersectionPolygonsByPolygons(polygons) {
	if (polygons.length == 0) {
		return []
	}

	var intersectedPolygons = [polygons[0]]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		var operatedPolygons = []
		for (var intersectedPolygon of intersectedPolygons) {
			Vector.pushArray(operatedPolygons, Polygon.getIntersectionPolygons(intersectedPolygon, polygons[polygonIndex]))
		}
		intersectedPolygons = operatedPolygons
	}

	return intersectedPolygons
}

function getIntersectionPairsMap(xyPolygons) {
	var intersectionPairsMap = new Map()
	var tripleIntersectionMap = new Map()
	for (var xyPolygon of xyPolygons) {
		for (xyIndex = 0; xyIndex < xyPolygon.length; xyIndex++) {
			var endIndex = (xyIndex + 1) % xyPolygon.length
			var xyBegin = xyPolygon[xyIndex]
			var xyEnd = xyPolygon[endIndex]
			var beginY = xyBegin[1]
			var endY = xyEnd[1]
			var maximumY = Math.floor(Math.max(beginY, endY) + 1.001)
			var minimumY = Math.ceil(Math.min(beginY, endY))
			for (y = minimumY; y < maximumY; y++) {
				var tripleIntersection = undefined
				if (tripleIntersectionMap.has(y)) {
					tripleIntersection = tripleIntersectionMap.get(y)
				}
				else {
					tripleIntersection = {aboves:[], belows:[], centers:[]}
					tripleIntersectionMap.set(y, tripleIntersection)
				}
				addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection, y)
			}
		}
	}
	for (var y of tripleIntersectionMap.keys()) {
		var tripleIntersection = tripleIntersectionMap.get(y)
		tripleIntersection.aboves.sort(Vector.compareNumberAscending)
		tripleIntersection.belows.sort(Vector.compareNumberAscending)
		tripleIntersection.centers.sort(Vector.compareNumberAscending)
		var beginSet = new Set()
		var endSet = new Set()
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.aboves)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.belows)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.centers)
		var beginIntersections = []
		for (var intersection of beginSet) {
			beginIntersections.push(intersection)
		}
		beginIntersections.sort(Vector.compareNumberAscending)
		var endIntersections = []
		for (var intersection of endSet) {
			endIntersections.push(intersection)
		}
		endIntersections.sort(Vector.compareNumberAscending)
		var intersectionPairs = []
		if (beginIntersections.length == endIntersections.length) {
			for (intersectionIndex = 0; intersectionIndex < beginIntersections.length; intersectionIndex++) {
				var beginIntersection = beginIntersections[intersectionIndex]
				var beginIndex = Math.round(Math.ceil(beginIntersection) + 0.001)
				var endIntersection = endIntersections[intersectionIndex]
				var endIndex = Math.floor(endIntersection)
				if (endIndex >= beginIndex) {
					var intersectionPair = {
						beginIndex:beginIndex,
						beginIntersection:beginIntersection,
						endIndex:endIndex,
						endIntersection:endIntersection}
					intersectionPairs.push(intersectionPair)
				}
//				else {
//					tripleIntersection.belows.sort(Vector.compareNumberAscending)
//				}
			}
		}
		else {
			console.log('beginIntersections.length: ' + beginIntersections.length + '   != endIntersections.length: endIntersections.length')
			console.log(intersections)
		}
		for (var intersectionPairIndex = 1; intersectionPairIndex < intersectionPairs.length; intersectionPairIndex++) {
			var intersectionPair = intersectionPairs[intersectionPairIndex]
			var previousIntersectionPair = intersectionPairs[intersectionPairIndex - 1]
			if (previousIntersectionPair.endIntersection == intersectionPair.beginIntersection) {
				warnings(['In getIntersectionPairsMap intersections meet', intersectionPairs, intersectionPairsMap])
			}
		}
		intersectionPairsMap.set(y, intersectionPairs)
	}
	return intersectionPairsMap
}

function getIsAwayFromHeight(splitHeight, workBeginY, workEndY) {
	var splitHeightMinus = splitHeight - gClose
	if (workBeginY < splitHeightMinus && workEndY < splitHeightMinus) {
		return true
	}
	var splitHeightPlus = splitHeight + gClose
	return workBeginY > splitHeightPlus && workEndY > splitHeightPlus
}

function getIsClear(side, sideOther, xIntersections) {
	var minimumX = Math.min(side, sideOther) - gClose
	var maximumX = Math.max(side, sideOther) + gClose
	for (var xIntersection of xIntersections) {
		if (xIntersection > minimumX && xIntersection < maximumX) {
			return false
		}
	}

	return true
}

function getIsConnectionClear(
distanceSquared, firstCheck, firstPoint, firstVertexIndex, polygons, otherPoint, otherPolygonIndex, otherVertexIndex) {
	VectorFast.divide2DScalar(firstCheck, Math.sqrt(distanceSquared))
	var firstPolygon = polygons[0]
	var otherPolygon = polygons[otherPolygonIndex]
	var reverseRotation = [firstCheck[0], -firstCheck[1]]
	var firstSliceRotated = getRotatedSlice(firstPolygon, (firstVertexIndex + 1) % firstPolygon.length, firstVertexIndex, reverseRotation)
	var otherSliceRotated = getRotatedSlice(otherPolygon, (otherVertexIndex + 1) % otherPolygon.length, otherVertexIndex, reverseRotation)
	var xIntersections = []
	var firstRotated = VectorFast.getRotation2DVector(firstPoint, reverseRotation)
	var y = firstRotated[1]
	Polyline.addXIntersectionsByPolylineClose(xIntersections, firstSliceRotated, y)
	Polyline.addXIntersectionsByPolylineClose(xIntersections, otherSliceRotated, y)
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		if (polygonIndex != otherPolygonIndex) {
			Polyline.addXIntersectionsByPolylineClose(xIntersections, Polyline.getRotation2DVector(polygons[polygonIndex], reverseRotation), y)
		}
	}

	return getIsClear(firstRotated[0], VectorFast.getRotation2DX(otherPoint, reverseRotation), xIntersections)
}

function getIsPointInsidePolygon(point, polygon) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	if (getNumberOfIntersectionsToLeft(point[0], xIntersections) % 2 == 1) {
		return true
	}

	swap2DPoint(point)
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, getSwapped2DPolygon(polygon), point[1])
	var x = point[0]
	swap2DPoint(point)
	return getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1
}

function getIsPointInsidePolygonOrClose(point, polygon) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	var x = point[0]
	if (getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1) {
		return true
	}
	for (var xIntersection of xIntersections) {
		if (Math.abs(xIntersection - x) < gClose) {
			return true
		}
	}
	swap2DPoint(point)
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, getSwapped2DPolygon(polygon), point[1])
	x = point[0]
	swap2DPoint(point)
	for (var xIntersection of xIntersections) {
		if (Math.abs(xIntersection - x) < gClose) {
			return true
		}
	}
	return getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1
}

function getIsPolygonBent(polygon) {
	removeIdentical3DPoints(polygon)
	if (polygon.length < 3) {
		return false
	}
	var center = polygon[0]
	var oldProduct = undefined
	var oldVector = VectorFast.getSubtraction3D(polygon[1], center)
	for (var vertexIndex = 2; vertexIndex < polygon.length; vertexIndex++) {
		vector = VectorFast.getSubtraction3D(polygon[vertexIndex], center)
		var product = VectorFast.crossProduct(oldVector, vector)
		var productLength = VectorFast.length3D(product)
		if (productLength > 0.0) {
			VectorFast.divide3DScalar(product, productLength)
			if (oldProduct != undefined) {
				if (Math.abs(VectorFast.dotProduct3D(product, oldProduct)) < gOneMinusClose) {
					return true
				}
			}
			oldProduct = product
		}
		oldVector = vector
	}
	return false
}

function getIsPolygonIntersecting(toolPolygon, workPolygon) {
	var toolBox = getBoundingBox(toolPolygon)
	var workBox = getBoundingBox(workPolygon)
	if (toolBox[1][0] < workBox[0][0] || toolBox[1][1] < workBox[0][1]) {
		return false
	}
	if (toolBox[0][0] > workBox[1][0] || toolBox[0][1] > workBox[1][1]) {
		return false
	}
	for (var point of toolPolygon) {
		if (getIsPointInsidePolygon(point, workPolygon)) {
			return true
		}
	}
	for (var point of workPolygon) {
		if (getIsPointInsidePolygon(point, toolPolygon)) {
			return true
		}
	}
	return getIsPolygonMeeting(toolPolygon, workPolygon)
}

function getIsPolygonIntersectingOrClose(toolPolygon, workPolygon) {
	var toolBox = getBoundingBox(toolPolygon)
	var workBox = getBoundingBox(workPolygon)
	if (toolBox[1][0] + gClose < workBox[0][0] || toolBox[1][1] + gClose < workBox[0][1]) {
		return false
	}

	if (toolBox[0][0] > workBox[1][0] + gClose || toolBox[0][1] > workBox[1][1] + gClose) {
		return false
	}

	for (var point of toolPolygon) {
		if (getIsPointInsidePolygonOrClose(point, workPolygon)) {
			return true
		}
	}

	for (var point of workPolygon) {
		if (getIsPointInsidePolygonOrClose(point, toolPolygon)) {
			return true
		}
	}

	return getIsPolygonMeeting(toolPolygon, workPolygon)
}

function getIsPolygonMeeting(toolPolygon, workPolygon) {
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var toolEndIndex = (toolBeginIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolBeginIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = VectorFast.getSubtraction2D(toolEnd, toolBegin)
		var deltaLength = VectorFast.length2D(delta)
		if (deltaLength != 0.0) {
			VectorFast.divide2DScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = VectorFast.getRotation2DVector(toolBegin, reverseRotation)
			var toolEndRotated = VectorFast.getRotation2DVector(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = Polyline.getRotation2DVector(workPolygon, reverseRotation)
			for (var workBeginIndex = 0; workBeginIndex < workPolygonRotated.length; workBeginIndex++) {
				var workEndIndex = (workBeginIndex + 1) % workPolygonRotated.length
				var workBeginRotated = workPolygonRotated[workBeginIndex]
				var workEndRotated = workPolygonRotated[workEndIndex]
				if (getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated) != null) {
					return true
				}
			}
		}
	}
	return false
}

function getIsTriangleTooThin(triangle) {
	for (var vertexIndex = 0; vertexIndex < triangle.length; vertexIndex++) {
		var endIndex = (vertexIndex + 2) % triangle.length
		if (getIsXYSegmentClose(triangle[vertexIndex], triangle[endIndex], triangle[(vertexIndex + 1) % triangle.length])) {
			return true
		}
	}
	return false
}

function getIsXYSegmentClose(begin, end, point) {
	var delta = VectorFast.getSubtraction2D(end, begin)
	var deltaLength = VectorFast.length2D(delta)
	if (deltaLength == 0.0) {
		return VectorFast.distanceSquared2D(begin, point) < gQuarterCloseSquared
	}
	VectorFast.divide2DScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = VectorFast.getRotation2DVector(begin, reverseRotation)
	var endRotatedX = end[0] * reverseRotation[0] - end[1] * reverseRotation[1]
	var pointRotated = VectorFast.getRotation2DVector(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return VectorFast.distanceSquared2D(begin, point) < gQuarterCloseSquared
	}
	if (pointRotated[0] > endRotatedX) {
		return VectorFast.distanceSquared2D(end, point) < gQuarterCloseSquared
	}
	return Math.abs(pointRotated[1] - beginRotated[1]) < gHalfClose
}

function getIsXYZCollinear(beginPoint, centerPoint, endPoint) {
	var vectorA = VectorFast.getSubtraction3D(centerPoint, beginPoint)
	var vectorB = VectorFast.getSubtraction3D(endPoint, centerPoint)
	var vectorALength = VectorFast.length3D(vectorA)
	var vectorBLength = VectorFast.length3D(vectorB)
	if (vectorALength == 0.0 && vectorBLength == 0.0) {
		warningByList(['In getIsCollinear both vectors have zero length:', vectorA, vectorB, beginPoint, centerPoint, endPoint])
		return true
	}

	if (vectorALength == 0.0 || vectorBLength == 0.0) {
		warningByList(['In getIsCollinear a vector has zero length:', vectorA, vectorB, beginPoint, centerPoint, endPoint])
		return false
	}

	VectorFast.divide3DScalar(vectorA, vectorALength)
	VectorFast.divide3DScalar(vectorB, vectorBLength)
	return Math.abs(VectorFast.dotProduct3D(vectorA, vectorB)) > gOneMinusClose
}

function getIsXYZSegmentClose(begin, end, point) {
	var delta = VectorFast.getSubtraction2D(end, begin)
	var deltaLength = VectorFast.length2D(delta)
	if (deltaLength == 0.0) {
		return VectorFast.distanceSquared3D(begin, point) < gCloseSquared
	}
	VectorFast.divide3DScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = VectorFast.getRotation2DVector(begin, reverseRotation)
	var endRotated = VectorFast.getRotation2DVector(end, reverseRotation)
	var pointRotated = VectorFast.getRotation2DVector(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return VectorFast.distanceSquared3D(begin, point) < gCloseSquared
	}
	if (pointRotated[0] > endRotated[0]) {
		return VectorFast.distanceSquared3D(end, point) < gCloseSquared
	}
	var pointAlong = (pointRotated[0] - beginRotated[0]) / (endRotated[0] - beginRotated[0])
	var xyDistance = Math.abs(pointRotated[1] - endRotated[1])
	var deltaHeight = point[2] - begin[2] * (1.0 - pointAlong) - end[2] * pointAlong
	return xyDistance * xyDistance + deltaHeight * deltaHeight < gCloseSquared
}

function getJoinedFacets(facets) {
	var arcMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var beginArc = facet[vertexIndex]
			var beginKey = facet[(vertexIndex + 1) % facet.length]
			var endKey = facet[(vertexIndex + 2) % facet.length]
			var endArc = facet[(vertexIndex + 3) % facet.length]
			arcMap.set(beginKey + ' ' + endKey, [beginArc, endArc])
		}
	}
	for (var key of arcMap.keys()) {
		var arc = arcMap.get(key)
		if (arc != null) {
			var keyStrings = key.split(' ')
			var reversedKey = keyStrings[1] + ' ' + keyStrings[0]
			if (arcMap.has(reversedKey)) {
				var reversedArc = arcMap.get(reversedKey)
				if (reversedArc != null) {
					arcMap.get(arc[0] + ' ' + keyStrings[0])[1] = reversedArc[1]
					arcMap.get(keyStrings[1] + ' ' + arc[1])[0] = reversedArc[0]
					arcMap.get(reversedArc[0] + ' ' + keyStrings[1])[1] = arc[1]
					arcMap.get(keyStrings[0] + ' ' + reversedArc[1])[0] = arc[0]
					arcMap.set(key, null)
					arcMap.set(reversedKey, null)
				}
			}
		}
	}
	return getJoinedFacetsByArcMap(arcMap)
}

function getJoinedFacetsByArcMap(arcMap) {
	var joinedFacets = []
	for (var key of arcMap.keys()) {
		var arc = arcMap.get(key)
		if (arc != null) {
			var facet = []
			do {
				facet.push(arc[0])
				arcMap.set(key, null)
				key = key.split(' ')[1] + ' ' + arc[1]
				arc = arcMap.get(key)
			}
			while (arc != null);
			joinedFacets.push(facet)
		}
	}
	return joinedFacets
}

function getJoinedMap(length, linkMap) {
	var joinedMap = new Map()
	for (var index = 0; index < length; index++) {
		var linkTop = MapKit.getLinkTop(index, linkMap)
		MapKit.addElementToMapArray(joinedMap, linkTop, index)
	}
	return joinedMap
}

function getLargestPolygon(polygons) {
	var greatestArea = 0.0
	var largestPolygon = []
	for (var polygon of polygons) {
		var doublePolygonArea = Math.abs(getDoublePolygonArea(polygon))
		if (doublePolygonArea >= greatestArea) {
			largestPolygon = polygon
			greatestArea = doublePolygonArea
		}
	}

	return largestPolygon
}

function getMaximumInset(polygon) {
	var minimumWidth = getMinimumWidth(polygon)
	return minimumWidth * 0.3 / (1.0 - getMinimumWidth(getOutsetPolygon(polygon, [-0.3 * minimumWidth])) / minimumWidth)
}

function getMaximumXIntersectionBefore(polygon, x, y) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, y)
	if (xIntersections.length == 0) {
		return undefined
	}

	var maximumX = -Number.MAX_VALUE
	for (var xIntersection of xIntersections) {
		if (xIntersection < x) {
			maximumX = Math.max(maximumX, xIntersection)
		}
	}

	return maximumX
}

function getMaximumXIntersectionByPolygon(xy, xyPolygonB) {
	var maximumX = -Number.MAX_VALUE
	var numberOfIntersectionsToLeft = 0
	var x = xy[0]
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, xyPolygonB, xy[1])
	for (var xIntersection of xIntersections) {
		if (xIntersection < x) {
			numberOfIntersectionsToLeft += 1
			maximumX = Math.max(maximumX, xIntersection)
		}
	}
	if (numberOfIntersectionsToLeft % 2 == 0) {
		return null
	}
	return maximumX
}

function getMeeting(toolBeginX, toolEndX, toolY, workBegin, workEnd) {
	if (toolBeginX == toolEndX) {
		return null
	}
	if (toolBeginX > toolEndX) {
		console.log('should never happen toolBeginX > toolEndX:' + toolBeginX + '    toolEndX:' + toolEndX)
		console.log('toolBeginX:' + toolBeginX + '    toolEndX:' + toolEndX)
	}
	var toolBeginXMinus = toolBeginX - gClose
	var toolEndXPlus = toolEndX + gClose
	var toolYMinus = toolY - gClose
	var toolYPlus = toolY + gClose
	var workBeginX = workBegin[0]
	var workEndX = workEnd[0]
	var workBeginY = workBegin[1]
	var workEndY = workEnd[1]
	if (workBeginX < toolBeginXMinus && workEndX < toolBeginXMinus) {
		return null
	}
	if (workBeginX > toolEndXPlus && workEndX > toolEndXPlus) {
		return null
	}
	if (workBeginY < toolYMinus && workEndY < toolYMinus) {
		return null
	}
	if (workBeginY > toolYPlus && workEndY > toolYPlus) {
		return null
	}
	var deltaY = workEndY - workBeginY
	if (Math.abs(deltaY) < gHalfClose) {
		return null
	}
	var workAlong = (toolY - workBeginY) / deltaY
	var toolInterceptX = (1.0 - workAlong) * workBeginX + workAlong * workEndX
	if (toolInterceptX < toolBeginXMinus) {
		return null
	}
	if (toolInterceptX > toolEndXPlus) {
		return null
	}
	var toolAlong = (toolInterceptX - toolBeginX) / (toolEndX - toolBeginX)
	var isToolNode = false
	if (toolAlong < gClose || toolAlong > gOneMinusClose) {
		isToolNode = true
	}
	var isWorkNode = workAlong < gClose || workAlong > gOneMinusClose
	return {isToolNode:isToolNode, isWorkNode:isWorkNode, toolAlong:toolAlong, workAlong:workAlong}
}

function getMeetingByHeight(splitHeight, workBeginY, workEndY) {
	if (workBeginY > splitHeight == workEndY > splitHeight) {
		return null
	}
	var deltaY = workEndY - workBeginY
	if (Math.abs(deltaY) < gClose) {
		return {isWorkNode:true, workAlong:0.0}
	}
	var workAlong = (splitHeight - workBeginY) / deltaY
	if (workAlong < gClose || workAlong > gOneMinusClose) {
		return {isWorkNode:true, workAlong:1.0 * (workAlong > 0.5)}
	}
	return {isWorkNode:false, workAlong:workAlong}
}

function getMinimumXIntersectionAfter(polygon, x, y) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, y)
	if (xIntersections.length == 0) {
		return undefined
	}

	var minimumX = Number.MAX_VALUE
	for (var xIntersection of xIntersections) {
		if (xIntersection > x) {
			minimumX = Math.min(minimumX, xIntersection)
		}
	}

	return minimumX
}

function getMinimumWidth(polygon) {
	var minimumWidth = undefined
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = VectorFast.getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = VectorFast.length2D(centerBegin)
		VectorFast.divide2DScalar(centerBegin, centerBeginLength)
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = VectorFast.length2D(centerEnd)
		VectorFast.divide2DScalar(centerEnd, centerEndLength)
		var insetDelta = getInsetDelta(centerBegin, centerEnd)
		var insetDeltaLength = VectorFast.length2D(insetDelta)
		if (insetDeltaLength != 0.0) {
			VectorFast.divide2DScalar(insetDelta, insetDeltaLength)
			var xyRotator = [insetDelta[0], -insetDelta[1]]
			var polygonRotated = Polyline.getRotation2DVector(polygon, xyRotator)
			var polylineRotated = polygonRotated.slice(vertexIndex + 1)
			Vector.pushArray(polylineRotated, polygonRotated.slice(0, vertexIndex))
			var centerRotated = polygonRotated[vertexIndex]
			var xIntersections = []
			Polyline.addXIntersectionsByPolylineClose(xIntersections, polylineRotated, centerRotated[1])
			for (var xIntersection of xIntersections) {
				if (xIntersection > centerRotated[0]) {
					var width = xIntersection - centerRotated[0]
					if (minimumWidth == undefined) {
						minimumWidth = width
					}
					else {
						if (width < minimumWidth) {
							minimumWidth = width
						}
					}
				}
			}
		}
	}
	if (minimumWidth == undefined) {
		return 0.0
	}
	return minimumWidth
}

function getNormalByPolygon(polygon) {
	var normal = getCrossProductByPolygon(polygon)
	var normalLength = VectorFast.length3D(normal)
	if (normalLength == 0.0) {
		return undefined
	}

	return VectorFast.divide3DScalar(normal, normalLength)
}

function getNumberOfIntersectionsToLeft(x, xIntersections) {
	var numberOfIntersectionsToLeft = 0
	for (var xIntersection of xIntersections) {
		numberOfIntersectionsToLeft += (xIntersection <= x)
	}
	return numberOfIntersectionsToLeft
}

function getNumberOfShells(insideMap, polygonIndex) {
	if (insideMap.has(polygonIndex)) {
		return insideMap.get(polygonIndex).length
	}
	return 0
}

function getOperatedPolygonsByExclusion(exclusion, toolPolygon, workPolygon) {
	var alongIndexesMap = new Map()
	var meetingMap = new Map()
	addMeetingsByPolygon(alongIndexesMap, meetingMap, toolPolygon, workPolygon)
	if (meetingMap.size == 0) {
		if (toolPolygon.length < 3) {
			if (exclusion.workExclusion != 1) {
				workPolygon = [[]]
			}
			return [workPolygon]
		}
		if (workPolygon.length < 3) {
			if (exclusion.workExclusion != 1) {
				toolPolygon = [[]]
			}
			return [toolPolygon]
		}
		if (getIsPointInsidePolygon(toolPolygon[0], workPolygon)) {
			return getPolygonsByExclusion(exclusion, toolPolygon, workPolygon)
		}
		if (getIsPointInsidePolygon(workPolygon[0], toolPolygon)) {
			return getPolygonsByExclusion(exclusion, workPolygon, toolPolygon)
		}
		if (exclusion.toolExclusion == 1) {
			return [getConnectedPolygon([workPolygon, toolPolygon])]
		}
		if (exclusion.workExclusion != 1) {
			workPolygon = [[]]
		}
		return [workPolygon]
	}

	sortAlongIndexesMap(alongIndexesMap, meetingMap)
	var extantPolygons = getExtantPolygons(alongIndexesMap, exclusion, false, meetingMap, toolPolygon, workPolygon)
	for (var extantPolygon of extantPolygons) {
		Vector.removeRepeats(extantPolygon)
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(' ')
			var meetingKey = nodeStrings[1]
			if (nodeStrings[0] == 't') {
				extantPolygon[nodeStringIndex] = toolPolygon[parseInt(meetingKey)]
			}
			else {
				if (nodeStrings[0] == 'w') {
					extantPolygon[nodeStringIndex] = workPolygon[parseInt(meetingKey)]
				}
				else {
					extantPolygon[nodeStringIndex] = meetingMap.get(meetingKey).point
				}
			}
		}
	}

	return extantPolygons
}

function getOperatorDirectedPolygon(isWorkClockwise, operator, toolPolygon) {
	if (operator[0] == 'd') {
		return getDirectedPolygon(!isWorkClockwise, toolPolygon)
	}
	return getDirectedPolygon(isWorkClockwise, toolPolygon)
}

function getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, polylines, tipMarker) {
	if (checkIntersection) {
		return getOutlinesCheckIntersection(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker)
	}

	return getOutlinesQuickly(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker)
}

function getOutlinesCheckIntersection(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker) {
	var outsetZero = outsets[0]
	var maximumRadius = Math.max(Math.abs(outsetZero[0]), Math.abs(outsetZero[1]))
	var outlines = getIntercircleLoopsByPolylines(polylines, 1.5 * maximumRadius)
	if (outsetZero[0] < 0.0) {
		for (var outline of outlines) {
			outline.reverse()
		}
	}

	for (var loopIndex = 0; loopIndex < outlines.length; loopIndex++) {
		var outline = outlines[loopIndex]
		outlines[loopIndex] = getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, outline, tipMarker)
	}

	return outlines
}

function getOutlinesQuickly(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker) {
	var arcMap = new Map()
	var gridMap = new Map()
	var nodes = []
	var outlines = []
	var points = []
	for (var polyline of polylines) {
		var previousIndex = undefined
		for (var point of polyline) {
			var pointIndex = getClosePointIndex(gridMap, point, points)
			if (pointIndex == nodes.length) {
				nodes.push([])
			}
			if (previousIndex != undefined) {
				nodes[previousIndex].push(pointIndex)
				nodes[pointIndex].push(previousIndex)
			}
			previousIndex = pointIndex
		}
	}

	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		if (node.length > 1) {
			var nodePoint = points[nodeIndex]
			var vectorZero = Vector.normalize2D(VectorFast.getSubtraction2D(points[node[0]], nodePoint))
			for (var lineIndex = 1; lineIndex < node.length; lineIndex++) {
				var vector = Vector.normalize2D(VectorFast.getSubtraction2D(points[node[lineIndex]], nodePoint))
				var crossProductZ = VectorFast.crossProduct2D(vector, vectorZero)
				node[lineIndex] = [Vector.getRelativeDirection([VectorFast.dotProduct2D(vector, vectorZero), crossProductZ]), node[lineIndex]]
			}
			node[0] = [1.0, node[0]]
			node.sort(Vector.compareElementZeroAscending)
			for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
				node[lineIndex] = node[lineIndex][1]
			}
		}
	}

	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
			var indexNodeLength = lineIndex + node.length
			arcMap.set(node[indexNodeLength % node.length] + ' ' + nodeIndex, node[(indexNodeLength + 1) % node.length])
		}
	}

	for (var key of arcMap.keys()) {
		var end = arcMap.get(key)
		if (end != null) {
			var nodeOutline = []
			do {
				nodeOutline.push(end)
				arcMap.set(key, null)
				key = key.split(' ')[1] + ' ' + end
				end = arcMap.get(key)
			}
			while (end != null)
			outlines.push(nodeOutline)
		}
	}

	for (var outlineIndex = 0; outlineIndex < outlines.length; outlineIndex++) {
		var polygon = getPolygonByFacet(outlines[outlineIndex], points)
//		removeCollinearXYPoints(polygon)	deprecated 24
		outlines[outlineIndex] = getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, polygon, tipMarker)
	}

	return outlines
}

function getOutsetBeginCenterEnd(beginPoint, centerPoint, endPoint, outset) {
	var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, centerPoint))
	var centerEnd = Vector.normalize2D(VectorFast.getSubtraction2D(endPoint, centerPoint))
	var outsetDelta = VectorFast.getAddition2D(centerBegin, centerEnd)
	var centerEndLeft = [centerEnd[1], -centerEnd[0]]
	var divisor = VectorFast.dotProduct2D(centerEndLeft, outsetDelta)
	if (Math.abs(divisor) < gClose) {
		outsetDelta = centerEndLeft
	}
	else {
		VectorFast.divide2DScalar(outsetDelta, divisor)
	}

	return VectorFast.add2D(VectorFast.multiply2D(outsetDelta, outset), centerPoint)
}

function getOutsetPoint(polygon, outset, vertexIndex) {
	var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
	var centerPoint = polygon[vertexIndex]
	var endPoint = polygon[(vertexIndex + 1) % polygon.length]
	return getOutsetBeginCenterEnd(beginPoint, centerPoint, endPoint, outset)
}

function getOutsetPolygon(polygon, outset) {
	if (!Polyline.isLongArray(polygon, 2)) {
		return undefined
	}

	removeIdentical2DPoints(polygon)
	if (polygon.length < 3) {
		return undefined
	}

	outset = Vector.fillRemaining(Vector.getArrayByValue(outset))
	var outsetPolygon = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		outsetPolygon[vertexIndex] = getOutsetPoint(polygon, outset, vertexIndex)
	}

	return outsetPolygon
}

function getOutsetPolygonByIndexes(polygon, outset, pointIndexes) {
	if (!Polyline.isLongArray(polygon, 2)) {
		return undefined
	}

	removeIdentical2DPoints(polygon)
	if (polygon.length < 3) {
		return undefined
	}

	outset = Vector.fillRemaining(Vector.getArrayByValue(outset))
	var outsetPolygon = Polyline.copy(polygon)
	if (pointIndexes == undefined) {
		pointIndexes = Vector.getSequence(polygon.length)
	}

	for (var pointIndex of pointIndexes) {
		outsetPolygon[pointIndex] = getOutsetPoint(polygon, outset, pointIndex)
	}

	return outsetPolygon
}

function getOutsetPolygons(polygons, outset) {
	outset = Vector.fillRemaining(Vector.getArrayByValue(outset))
	var outsetPolygons = new Array(polygons.length)
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		outsetPolygons[polygonIndex] = getOutsetPolygon(polygons[polygonIndex], outset)
	}

	return outsetPolygons
}

function getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, polygon, tipMarker) {
	removeIdentical2DPoints(polygon)
	var outset = outsets[0]
	var outsetPolygon = []
	var closestVertexIndex = undefined
	var stringAlongMap = undefined
	if (Vector.isEmpty(baseLocation)) {
		outsets = outsets[0]
	}
	else {
		var closestDistanceSquared = Number.MAX_VALUE
		for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
			var distanceSquared = VectorFast.distanceSquared2D(baseLocation, polygon[vertexIndex])
			if (distanceSquared < closestDistanceSquared) {
				closestDistanceSquared = distanceSquared
				closestVertexIndex = vertexIndex
			}
		}
		if (outsets.length > 1) {
			stringAlongMap = getStringAlongMap(closestVertexIndex, polygon)
		}
	}

	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, centerPoint))
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = Vector.normalize2D(VectorFast.getSubtraction2D(endPoint, centerPoint))
		var dotProduct = VectorFast.dotProduct2D(centerBegin, centerEnd)
		var centerRight = [-centerEnd[1], centerEnd[0]]
		var centerLeft = [centerEnd[1], -centerEnd[0]]
		var marker = tipMarker
		if (vertexIndex == closestVertexIndex) {
			marker = baseMarker
		}
		if (stringAlongMap != undefined) {
			var along = stringAlongMap.get(centerPoint[0].toString() + ' ' + centerPoint[1].toString())
			var alongOver = along / (outsets.length - 1)
			var lowerIndex = Math.floor(alongOver)
			var upperIndex = Math.ceil(alongOver)
			var along = alongOver - lowerIndex
			outset = VectorFast.getMultiplication2DScalar(outsets[lowerIndex], 1.0 - along)
			VectorFast.add2D(outset, VectorFast.getMultiplication2DScalar(outsets[upperIndex], along))
		}

		if (dotProduct > 0.999) {
			if (Vector.isEmpty(marker)) {
				var sideConcatenation = VectorFast.getAddition2D(centerRight, centerLeft)
				var backConcatenation = Vector.normalize2D(VectorFast.getAddition2D(centerBegin, centerEnd))
				var backProduct = VectorFast.dotProduct2D(backConcatenation, centerBegin)
				var backSideRemainder = 0.5 * VectorFast.length2D(sideConcatenation) / VectorFast.length2D(backConcatenation) - 1.0
				backSideRemainder /= VectorFast.dotProduct2D(backConcatenation, centerBegin)
				VectorFast.add2D(centerLeft, VectorFast.multiply2DScalar(centerBegin, backSideRemainder))
				VectorFast.add2D(centerRight, VectorFast.multiply2DScalar(centerEnd, backSideRemainder))
				outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(centerRight, outset)))
				outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(centerLeft, outset)))
			}
			else {
				outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(centerRight, outset)))
				for (var vertex of marker) {
					var rotatedVertex = VectorFast.getRotation2DVector(vertex, centerRight)
					if (!markerAbsolute) {
						VectorFast.multiply2D(rotatedVertex, outset)
					}
					outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), rotatedVertex))
				}
				outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(centerLeft, outset)))
			}
		}
		else {
			var outsetDelta = VectorFast.getAddition2D(centerBegin, centerEnd)
			var leftDotProduct = VectorFast.dotProduct2D(centerLeft, outsetDelta)
			if (Math.abs(leftDotProduct) < gClose) {
				outsetDelta = centerLeft
			}
			else {
				VectorFast.divide2DScalar(outsetDelta, leftDotProduct)
			}
			outsetPolygon.push(VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(outsetDelta, outset)))
		}
	}

	return outsetPolygon
}

function getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, polygon, tipMarker) {
	if (polygon.length < 1) {
		return []
	}

	var polyline = polygon.slice(0)
	polyline.push(polyline[0])
	var outlines = getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, [polyline], tipMarker)
	if (clockwise) {
		return outlines.filter(Polygon.isClockwise)
	}

	return outlines.filter(Polygon.isCounterclockwise)
}

// not used but might be useful someday
function getPlaneByNormal(normal) {
	var furthestAxis = [1.0, 0.0, 0.0]
	var smallestDotProduct = Math.abs(VectorFast.dotProduct3D(normal, furthestAxis))
	var yAxis = [0.0, 1.0, 0.0]
	var dotProduct = Math.abs(VectorFast.dotProduct3D(normal, yAxis))
	if (dotProduct < smallestDotProduct) {
		smallestDotProduct = dotProduct
		furthestAxis = yAxis
	}
	var zAxis = [0.0, 0.0, 1.0]
	dotProduct = Math.abs(VectorFast.dotProduct3D(normal, zAxis))
	if (dotProduct < smallestDotProduct) {
		furthestAxis = zAxis
	}
	var xBasis = VectorFast.crossProduct(normal, furthestAxis)
	VectorFast.divide3DScalar(xBasis, VectorFast.length3D(xBasis))
	return [xBasis, VectorFast.crossProduct(normal, xBasis)]
}

function getPointIndexesInCircle(gridMap, halfMinusOver, point, points, radiusSquared) {
	var floorX = Math.floor(point[0] * halfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * halfMinusOver)
	var floorYPlus = floorY + 2
	var indexesInCircle = []
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				for (var pointIndex of pointIndexes) {
					if (VectorFast.distanceSquared2D(point, points[pointIndex]) <= radiusSquared) {
						indexesInCircle.push(pointIndex)
					}
				}
			}
		}
	}
	return indexesInCircle
}

function getPointsByString(pointString) {
	if (pointString == '') {
		return []
	}
	var parameterStrings = pointString.split(' ').filter(lengthCheck)
	for (parameterIndex = 0; parameterIndex < parameterStrings.length; parameterIndex++) {
		parameterStrings[parameterIndex] = parameterStrings[parameterIndex].split(',').map(parseFloat)
	}
	return parameterStrings
}

function getPointInsidePolygon(polygon) {
	if (Vector.isEmpty(polygon)) {
		return undefined
	}
	var maximumY = -Number.MAX_VALUE
	var minimumY = Number.MAX_VALUE
	for (var point of polygon) {
		maximumY = Math.max(maximumY, point[1])
		minimumY = Math.min(minimumY, point[1])
	}
	var midX = undefined
	var midY = 0.5 * (minimumY + maximumY)
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, midY)
	xIntersections.sort(Vector.compareNumberAscending)
	var greatestWidth = -Number.MAX_VALUE
	for (var intersectionIndex = 0; intersectionIndex < xIntersections.length; intersectionIndex += 2) {
		var nextIndex = intersectionIndex + 1
		if (nextIndex < xIntersections.length) {
			var beginX = xIntersections[intersectionIndex]
			var endX = xIntersections[nextIndex]
			var width = endX - beginX
			if (width > greatestWidth) {
				greatestWidth = width
				midX = 0.5 * (beginX + endX)
			}
		}
	}
	if (midX == undefined) {
		return undefined
	}
	return [midX, midY]
}

function getPolygon3D(polygon, z) {
	if (Vector.isEmpty(polygon)) {
		return polygon
	}

	if (polygon[0].length > 2) {
		return polygon
	}

	var polygon3D = new Array(polygon.length)
	z = Value.getValueDefault(z, 0.0)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var vertex = polygon[vertexIndex]
		polygon3D[vertexIndex] = [vertex[0], vertex[1], z]
	}

	return polygon3D
}

function getPolygonArea(polygon) {
	return 0.5 * getDoublePolygonArea(polygon)
}

function getPolygonCenterRadiusFromTo(center, radius, fromAngle, toAngle, sides) {
	var endAngle = fromAngle
	if (toAngle > fromAngle) {
		endAngle += gPI2
	}
	else {
		endAngle -= gPI2
	}

	var polygon = spiralCenterRadiusOnly(center, radius, fromAngle, toAngle, sides)
	return Vector.pushArray(polygon, spiralCenterRadiusOnly(center, radius, toAngle, endAngle, sides, undefined, false, false))
}

function getPolygonCrossesSplitHeight(splitHeight, splitPolygon) {
	for (var vertexIndex = 0; vertexIndex < splitPolygon.length; vertexIndex++) {
		if (splitHeight > splitPolygon[vertexIndex][2] != splitHeight > splitPolygon[(vertexIndex + 1) % splitPolygon.length][2]) {
			return true
		}
	}

	return false
}

function getPolygonCrossesHeights(boundaryPolygon, splitHeight, splitPolygon, stratas) {
	if (!getIsPolygonInStratas(splitPolygon, stratas)) {
		return false
	}
	if (!getIsPolygonIntersectingOrClose(boundaryPolygon, splitPolygon)) {
		return false
	}
	for (var vertexIndex = 0; vertexIndex < splitPolygon.length; vertexIndex++) {
		if (splitHeight > splitPolygon[vertexIndex][2] != splitHeight > splitPolygon[(vertexIndex + 1) % splitPolygon.length][2]) {
			return true
		}
	}
	return false
}

function getPolygonByFacet(facet, points) {
	var polygon = new Array(facet.length)
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		polygon[vertexIndex] = points[facet[vertexIndex]]
	}
	return polygon
}

function getPolygonGroups(polygons) {
	var polygonIndexGroups = getPolygonIndexGroups(polygons)
	var polygonGroups = new Array(polygonIndexGroups.length)
	for (var polygonGroupIndex = 0; polygonGroupIndex < polygonGroups.length; polygonGroupIndex++) {
		var polygonIndexGroup = polygonIndexGroups[polygonGroupIndex]
		if (polygonIndexGroup.length == 1) {
			polygonGroups[polygonGroupIndex] = [polygons[polygonIndexGroup]]
		}
		else {
			var polygonGroup = new Array(polygonIndexGroup.length)
			for (var polygonIndex = 0; polygonIndex < polygonGroup.length; polygonIndex++) {
				polygonGroup[polygonIndex] = polygons[polygonIndexGroup[polygonIndex]]
			}
			polygonGroups[polygonGroupIndex] = polygonGroup
		}
	}
	return polygonGroups
}

function getPolygonIndexGroups(polygons) {
	var insideMap = new Map()
	var outsideMap = new Map()
	var polygonIndexGroups = []
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var outsides = []
		var polygon = polygons[polygonIndex]
		var point = polygon[0]
		for (var outsideIndex = 0; outsideIndex < polygonIndex; outsideIndex++) {
			if (getPolygonInsideness(point, polygons[outsideIndex]) == 1) {
				outsides.push(outsideIndex)
				MapKit.addElementToMapArray(insideMap, polygonIndex, outsideIndex)
			}
		}
		for (var outsideIndex = polygonIndex + 1; outsideIndex < polygons.length; outsideIndex++) {
			if (getPolygonInsideness(point, polygons[outsideIndex]) == 1) {
				outsides.push(outsideIndex)
				MapKit.addElementToMapArray(insideMap, polygonIndex, outsideIndex)
			}
		}
	}
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		if (insideMap.has(polygonIndex)) {
			if (insideMap.get(polygonIndex).length % 2 == 0) {
				outsideMap.set(polygonIndex, [polygonIndex])
			}
		}
		else {
			outsideMap.set(polygonIndex, [polygonIndex])
		}
	}
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		if (!outsideMap.has(polygonIndex)) {
			var outsides = insideMap.get(polygonIndex)
			var insideIndex = outsides[0]
			var greatestShells = getNumberOfShells(insideMap, insideIndex)
			for (var outsideIndex = 1; outsideIndex < outsides.length; outsideIndex++) {
				var numberOfShells = getNumberOfShells(insideMap, outsides[outsideIndex])
				if (numberOfShells > greatestShells) {
					greatestShells = numberOfShells
					insideIndex = outsides[outsideIndex]
				}
			}
			MapKit.addElementToMapArray(outsideMap, insideIndex, polygonIndex)
		}
	}
	for (var value of outsideMap.values()) {
		polygonIndexGroups.push(value)
	}
	return polygonIndexGroups
}

function getPolygonInsideness(point, polygon) {
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		if (getIsXYSegmentClose(polygon[pointIndex], polygon[(pointIndex + 1) % polygon.length], point)) {
			return 0
		}
	}
	if (getIsPointInsidePolygon(point, polygon)) {
		return 1
	}
	return -1
}

function getPolygonPerimeter(polygon) {
	var polygonPerimeter = 0.0
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		polygonPerimeter += VectorFast.distance2D(polygon[vertexIndex], polygon[(vertexIndex + 1) % polygon.length])
	}

	return polygonPerimeter
}

function getPolygonRotatedToIndex(polygon, vertexIndex = 0) {
	return Vector.pushArray(polygon.slice(vertexIndex), polygon.slice(0, vertexIndex))
}

function getPolygonRotatedToLower(polygon, parameterIndex = 0) {
	if (polygon.length == 0) {
		return polygon
	}

	var bottomIndex = 0
	var minimumKey = polygon[0][parameterIndex]
	var otherIndex = 1
	if (parameterIndex == 1) {
		otherIndex = 0
	}

	var otherMinimumKey = polygon[0][otherIndex]
	for (var keyIndex = 1; keyIndex < polygon.length; keyIndex++) {
		var point = polygon[keyIndex]
		var key = point[parameterIndex]
		if (key < minimumKey) {
			minimumKey = key
			bottomIndex = keyIndex
		}
		else {
			if (key == minimumKey && point.length > 1) {
				var otherKey = point[otherIndex]
				if (otherKey < otherMinimumKey) {
					otherMinimumKey = otherKey
					bottomIndex = keyIndex
				}
			}
		}
	}

	return getPolygonRotatedToIndex(polygon, bottomIndex)
}

function getPolygonsByArrowMap(arrowMap, pointMap) {
	var polygons = addFacetsByArrowMap(arrowMap, [])
	for (var polygon of polygons) {
		for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			polygon[keyIndex] = pointMap.get(polygon[keyIndex] )
		}
	}
	return polygons
}

function getPolygonsByExclusion(exclusion, insidePolygon, outsidePolygon) {
	if (exclusion.toolExclusion == 1) {
		return [outsidePolygon]
	}

	if (exclusion.workExclusion == 1) {
		return [getConnectedPolygon([outsidePolygon, insidePolygon])]
	}

	return [insidePolygon]
}

function getPolygonsByFacetIndexes(facetIndexes, facets, points) {
	var polygons = new Array(facetIndexes.length)
	for (var facetIndexIndex = 0; facetIndexIndex < facetIndexes.length; facetIndexIndex++) {
		polygons[facetIndexIndex] = getPolygonByFacet(facets[facetIndexes[facetIndexIndex]], points)
	}
	return polygons
}

function getPolygonsByFacets(facets, points) {
	var polygons = new Array(facets.length)
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		polygons[facetIndex] = getPolygonByFacet(facets[facetIndex], points)
	}
	return polygons
}

function getPolygonsByLines(lines, pointMap) {
	var arrowMap = new Map()
	for (var line of lines) {
		arrowMap.set(line.beginKey, line)
	}
	return getPolygonsByArrowMap(arrowMap, pointMap)
}

function getPolygonSegments(alongIndexesMap, meetingMap, polygon, prefix) {
	var polygonSegments = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var nodeKey = prefix + ' ' + vertexIndex.toString()
		polygonSegments.push([{nodeKey:nodeKey, point:polygon[vertexIndex]}])
		if (alongIndexesMap.has(nodeKey)) {
			var alongIndexes = alongIndexesMap.get(nodeKey)
			for (var alongIndex of alongIndexes) {
				if (alongIndex[0] == 0.0) {
					if (polygonSegments[polygonSegments.length - 1][0].nodeKey[0] != 'm') {
						polygonSegments.pop()
					}
				}
				polygonSegments.push([{nodeKey:'m ' + alongIndex[1], point:meetingMap.get(alongIndex[1]).point}])
			}
		}
	}

	for (var polygonSegmentIndex = 0; polygonSegmentIndex < polygonSegments.length; polygonSegmentIndex++) {
		polygonSegments[polygonSegmentIndex].push(polygonSegments[(polygonSegmentIndex + 1) % polygonSegments.length][0])
	}

	return polygonSegments
}

function getPolygonSlice(polygon, beginIndex, endIndex) {
	if (polygon.length == 0) {
		return []
	}

	var polygonSlice = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var sourceIndex = (vertexIndex + beginIndex) % polygon.length
		if (sourceIndex == endIndex) {
			return polygonSlice
		}
		polygonSlice.push(polygon[sourceIndex])
	}

	printCaller(['Could not find the endIndex for getPolygonSlice in polygon.', polygon, beginIndex, endIndex])
	return polygon
}

function getPolylineSlice(begin, end, polyline, parameterIndex = 0) {
	if (end <= begin) {
		return undefined
	}

	var polylineSlice = []
	var startIndex = 0 
	for (; startIndex < polyline.length; startIndex++) {
		var point = polyline[startIndex]
		var value = point[parameterIndex]
		if (value > begin) {
			if (startIndex == 0) {
				if (value >= end) {
					return undefined
				}
				polylineSlice.push(point)
				startIndex = 1
			}
			else {
				var previousPoint = polyline[startIndex - 1]
				var along = (begin - previousPoint[parameterIndex]) / (value - previousPoint[parameterIndex])
				polylineSlice.push(Vector.interpolationFromToAlong2D(previousPoint, point, along))
			}
			break
		}
	}

	if (polylineSlice.length == 0) {
		return undefined
	}

	for (; startIndex < polyline.length; startIndex++) {
		var point = polyline[startIndex]
		var value = point[parameterIndex]
		if (value >= end) {
			var previousPoint = polyline[startIndex - 1]
			var along = (end - previousPoint[parameterIndex]) / (value - previousPoint[parameterIndex])
			polylineSlice.push(Vector.interpolationFromToAlong2D(previousPoint, point, along))
			return polylineSlice
		}
		else {
			polylineSlice.push(point)
		}
	}

	return polylineSlice
}

function getPolynodes(toolSegments, workSegments) {
	var startIndex = Vector.getStartIndex(workSegments)
	if (startIndex == undefined) {
		if (workSegments[0] == null) {
			return []
		}
		var polynode = new Array(workSegments.length)
		for (var segmentIndex = 0; segmentIndex < workSegments.length; segmentIndex++) {
			polynode[segmentIndex] = workSegments[segmentIndex][0].nodeKey
		}
		return [polynode]
	}

	var lastNode = undefined
	var polynode = []
	var polynodeMap = new Map()
	for (var extraIndex = 0; extraIndex < workSegments.length; extraIndex++) {
		var segmentIndex = (startIndex + extraIndex) % workSegments.length
		var segment = workSegments[segmentIndex]
		if (segment == null) {
			if (polynode.length > 0) {
				polynode.push(lastNode)
				polynodeMap.set(polynode[0], polynode)
				polynode = []
			}
		}
		else {
			polynode.push(segment[0].nodeKey)
			lastNode = segment[1].nodeKey
		}
	}

	if (polynode.length > 0) {
		polynode.push(lastNode)
		polynodeMap.set(polynode[0], polynode)
	}

	var nodeMap = new Map()
	for (var segment of toolSegments) {
		if (segment != null) {
			nodeMap.set(segment[0].nodeKey, segment[1].nodeKey)
		}
	}

	var polynodes = []
	for (var key of polynodeMap.keys()) {
		if (polynodeMap.get(key) != undefined) {
			addToPolynodes(key, nodeMap, polynodeMap, polynodes)
		}
	}

	return polynodes
}

function getRectangleBoundingBox(boundingBox) {
	return getRectangleCornerParameters(boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1])
}

function getRectangleCenterOutset(center, outset) {
	outset = Vector.fillRemaining(Vector.getArrayByValue(outset))
	return getRectangleBoundingBox([VectorFast.getSubtraction2D(center, outset), VectorFast.getAddition2D(center, outset)])
}

function getRectangleCornerParameters(minimumX, minimumY, maximumX, maximumY) {
	return [[minimumX, minimumY], [maximumX, minimumY], [maximumX, maximumY], [minimumX, maximumY]]
}

function getRegularPolygon(center, isCounterclockwise, outsideness, radius, sideOffset, sides, startAngle) {
	var angleIncrement = gPI2 / sides
	startAngle += sideOffset * angleIncrement
	radius *= outsideness / Math.cos(0.5 * angleIncrement) + 1.0 - outsideness
	var points = new Array(sides)
	if (!isCounterclockwise) {
		angleIncrement = -angleIncrement
		startAngle = -startAngle
	}

	var point = Vector.polarRadius(startAngle, radius)
	var rotation = Vector.polarCounterclockwise(angleIncrement)
	for (var vertexIndex = 0; vertexIndex < sides; vertexIndex++) {
		points[vertexIndex] = VectorFast.getAddition2D(point, center)
		VectorFast.rotate2DVector(point, rotation)
	}

	return points
}

function getRotatedSlice(polygon, beginIndex, endIndex, vector) {
	var polygonSlice = getPolygonSlice(polygon, beginIndex, endIndex)
	for (var vertexIndex = 0; vertexIndex < polygonSlice.length; vertexIndex++) {
		polygonSlice[vertexIndex] = VectorFast.getRotation2DVector(polygonSlice[vertexIndex], vector)
	}
	return polygonSlice
}

// deprecated25
/*
function getSegmentArrays(polygonSegments, startIndex) {
	var segmentArrays = []
	var workSegments = null
	for (var extraIndex = 0; extraIndex < polygonSegments.length; extraIndex++) {
		var segmentIndex = (startIndex + extraIndex) % polygonSegments.length
		var workPolygonSegment = polygonSegments[segmentIndex]
		if (workPolygonSegment == null) {
			if (workSegments != null) {
				segmentArrays.push(workSegments)
				workSegments = null
			}
		}
		else {
			if (workSegments == null) {
				workSegments = []
			}
			workSegments.push(workPolygonSegment)
		}
	}

	return segmentArrays
}
*/
function getSlicePolygonsByArrowsMap(arrowsMap, points, z) {
	var xyPolygons = []
	for (var arrowKey of arrowsMap.keys()) {
		var arrows = arrowsMap.get(arrowKey)
		if (arrows != null) {
			var arrow = arrows[0]
			var keys = [arrowKey]
			arrowsMap.set(arrowKey, null)
			do {
				if (arrowsMap.has(arrow)) {
					var nextArrows = arrowsMap.get(arrow)
					if (nextArrows == null) {
						xyPolygons.push(keys)
						break
					}
					else {
						var closePolygon = true
						for (var nextArrow of nextArrows) {
							if (arrowKey != nextArrow) {
								arrowKey = arrow
								arrowsMap.set(arrowKey, null)
								arrow = nextArrow
								keys.push(arrowKey)
								closePolygon = false
								break
							}
						}
						if (closePolygon) {
							arrowsMap.set(arrowKey, null)
							arrow = arrowKey
						}
					}
				}
				else {
					xyPolygons.push(keys)
					break
				}
				if (keys[0] == arrow) {
					xyPolygons.push(keys)
					break
				}
			}
			while (keys.length < points.length)
		}
	}
	for (var xyPolygon of xyPolygons) {
		for (var keyIndex = 0; keyIndex < xyPolygon.length; keyIndex++) {
			xyPolygon[keyIndex] = getPointAlongEdge(xyPolygon[keyIndex], points, z)
		}
	}
	return xyPolygons
}

function getStringAlongMap(baseIndex, polygon) {
	var arrowSetMap = new Map()
	var baseString = polygon[baseIndex][0].toString() + ' ' + polygon[baseIndex][1].toString()
	var checkSet = new Set([baseString])
	var stringAlongMap = new Map([[baseString, [0.0, 0.0]]])
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		var pointString = polygon[vertexIndex][0].toString() + ' ' + polygon[vertexIndex][1].toString()
		var nextPointString = nextPoint[0].toString() + ' ' + nextPoint[1].toString()
		if (arrowSetMap.has(pointString)) {
			arrowSetMap.get(pointString).add(nextPointString)
		}
		else {
			arrowSetMap.set(pointString, new Set([nextPointString]))
		}
		if (arrowSetMap.has(nextPointString)) {
			arrowSetMap.get(nextPointString).add(pointString)
		}
		else {
			arrowSetMap.set(nextPointString, new Set([pointString]))
		}
	}
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		var newCheckSet = new Set()
		for (var checkString of checkSet) {
			var arrowSet = arrowSetMap.get(checkString)
			var checkWords = checkString.split(' ')
			var point = [parseFloat(checkWords[0]), parseFloat(checkWords[1])]
			for (var arrowString of arrowSet) {
				if (!stringAlongMap.has(arrowString)) {
					var arrowWords = arrowString.split(' ')
					var arrowPoint = [parseFloat(arrowWords[0]), parseFloat(arrowWords[1])]
					var distance = stringAlongMap.get(checkString)[0]
					newCheckSet.add(arrowString)
					stringAlongMap.set(arrowString, [distance + VectorFast.distance2D(point, arrowPoint), 0.0, checkString])
				}
			}
		}
		if (newCheckSet.size == 0) {
			break
		}
		checkSet = newCheckSet
	}
	for (var stringAlongKey of stringAlongMap.keys()) {
		var stringAlong = stringAlongMap.get(stringAlongKey)
		if (stringAlong.length > 2) {
			var arrowSet = arrowSetMap.get(stringAlongKey)
			var isTip = arrowSet.size == 1
			if (arrowSet.size == 2) {
				var vectors = []
				var stringWords = stringAlongKey.split(' ')
				var centerPoint = [parseFloat(stringWords[0]), parseFloat(stringWords[1])]
				for (var arrow of arrowSet) {
					var arrowWords = arrow.split(' ')
					vectors.push(Vector.normalize2D(VectorFast.getSubtraction2D([parseFloat(arrowWords[0]), parseFloat(arrowWords[1])], centerPoint)))
				}
				isTip = VectorFast.dotProduct2D(vectors[0], vectors[1]) > gOneMinusClose
			}
			if (isTip) {
				var tipDistance = stringAlong[0]
				for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
					if (tipDistance > stringAlong[1]) {
						stringAlong[1] = tipDistance
					}
					if (stringAlong[2] == undefined) {
						break
					}
					stringAlong = stringAlongMap.get(stringAlong[2])
				}
			}
		}
	}
	for (var stringAlongKey of stringAlongMap.keys()) {
		var stringAlongValue = stringAlongMap.get(stringAlongKey)
		stringAlongMap.set(stringAlongKey, stringAlongValue[0] / stringAlongValue[1])
	}
	return stringAlongMap
}

function getSwapped2DPolygon(polygon) {
	var swapped2DPolygon = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var point = polygon[vertexIndex]
		swapped2DPolygon[vertexIndex] = [point[1], point[0]]
	}
	return swapped2DPolygon
}

function getUFromAngleToAngle(fromPoint, fromAngle, toPoint, toAngle, length, numberOfSides) {
	var arc = getArcFromAngleToAngle(fromPoint, fromAngle, toPoint, toAngle, numberOfSides)
	if (arc.length < 2 || length <= 0.0) {
		return arc
	}

	var endPoint = arc[arc.length - 1]
	var endMinusPenultimate = VectorFast.getSubtraction2D(endPoint, arc[arc.length - 2])
	var endMinusPenultimateLength = VectorFast.length2D(endMinusPenultimate)
	if (endMinusPenultimateLength > 0.0) {
		arc.push(VectorFast.getAddition2D(endPoint, VectorFast.multiply2DScalar(endMinusPenultimate, length / endMinusPenultimateLength)))
	}

	var zeroPoint = arc[0]
	var zeroMinusSecond = VectorFast.getSubtraction2D(zeroPoint, arc[1])
	var zeroMinusSecondLength = VectorFast.length2D(zeroMinusSecond)
	if (zeroMinusSecondLength > 0.0) {
		arc.splice(0, 0, VectorFast.getAddition2D(zeroPoint, VectorFast.multiply2DScalar(zeroMinusSecond, length / zeroMinusSecondLength)))
	}

	return arc
}

function getUnionPolygonsByPolygons(polygons) {
	if (polygons.length == 0) {
		return []
	}

	var joinedPolygons = [polygons[0]]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		var operatedPolygons = []
		for (var joinedPolygon of joinedPolygons) {
			Vector.pushArray(operatedPolygons, Polygon.getUnionPolygons(joinedPolygon, polygons[polygonIndex]))
		}
		joinedPolygons = operatedPolygons
	}
	return joinedPolygons
}

function getVerticalBound(points) {
	if (Vector.isEmpty(points)) {
		return undefined
	}

	var verticalBound = [Number.MAX_VALUE, -Number.MAX_VALUE]
	for (var point of points) {
		verticalBound[0] = Math.min(verticalBound[0], point[1])
		verticalBound[1] = Math.max(verticalBound[1], point[1])
	}

	return verticalBound
}

function getWidenedPolygon(polygon, widening) {
	var widenedPolygon = Polyline.copy(polygon)
	var averageX = 0.0
	for (var point of widenedPolygon) {
		averageX += point[0]
	}

	averageX /= polygon.length
	for (var point of widenedPolygon) {
		if (point[0] > averageX) {
			point[0] += widening
		}
		else {
			point[0] -= widening
		}
	}

	return widenedPolygon
}

function getZByPointPolygon(point, polygon) {
	var closestPoint = polygon[getClosestPointIndex(point, polygon)]
	var normal = getNormalByPolygon(polygon)
	var z = closestPoint[2]
	if (normal == undefined) {
		return z
	}

	var normalZ = normal[2]
	if (normalZ == 0.0) {
		return z
	}

	var pointClosest = VectorFast.divide2DScalar(VectorFast.getSubtraction2D(closestPoint, point), normalZ)
	return z + pointClosest[0] * normal[0] + pointClosest[1] * normal[1]
}

function intersectionXExistences(xExistences, xIntersectionExistences) {
	if (xIntersectionExistences == undefined) {
		return []
	}

	unionXExistencesOnly(xExistences)
	unionXExistencesOnly(xIntersectionExistences)
	var xDensities = new Array(xExistences.length + xIntersectionExistences.length)
	for (var xExistenceIndex = 0; xExistenceIndex < xExistences.length; xExistenceIndex += 2) {
		xDensities[xExistenceIndex] = [xExistences[xExistenceIndex], 1]
		xDensities[xExistenceIndex + 1] = [xExistences[xExistenceIndex + 1], -1]
	}

	for (var xIntersectionIndex = 0; xIntersectionIndex < xIntersectionExistences.length; xIntersectionIndex += 2) {
		xDensities[xIntersectionIndex + xExistences.length] = [xIntersectionExistences[xIntersectionIndex], 1]
		xDensities[xIntersectionIndex + 1 + xExistences.length] = [xIntersectionExistences[xIntersectionIndex + 1], -1]
	}

	unionXDensities(xDensities, xExistences)
}

function isPointInsideBoundingBox(boundingBox, point) {
	if (point[0] < boundingBox[0][0]) {
		return false
	}
	if (point[1] < boundingBox[0][1]) {
		return false
	}
	if (point[0] > boundingBox[1][0]) {
		return false
	}
	return point[1] <= boundingBox[1][1]
}

function isPointInsideBoundingBoxOrClose(boundingBox, point) {
	if (point[0] + gClose < boundingBox[0][0]) {
		return false
	}
	if (point[1] + gClose < boundingBox[0][1]) {
		return false
	}
	if (point[0] > boundingBox[1][0] + gClose) {
		return false
	}
	return point[1] < boundingBox[1][1] + gClose
}

function isPointInsideBoundingBoxPolygonOrClose(boundingBox, point, polygon) {
	if (!isPointInsideBoundingBoxOrClose(boundingBox, point)) {
		return false
	}

	return getIsPointInsidePolygonOrClose(point, polygon)
}

function isPointOutsideOrBorderingCircles(gridMap, halfMinusOver, linkSet, point, points, radiusSquared) {
	var floorX = Math.floor(point[0] * halfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * halfMinusOver)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				for (var pointIndex of pointIndexes) {
					if (!linkSet.has(pointIndex)) {
						if (VectorFast.distanceSquared2D(point, points[pointIndex]) <= radiusSquared) {
							return false
						}
					}
				}
			}
		}
	}
	return true
}

function nullifyExcludedMidpoints(excludeInsidenessSet, otherPolygon, polygonSegments) {
	for (var vertexIndex = 0; vertexIndex < polygonSegments.length; vertexIndex++) {
		var polygonSegment = polygonSegments[vertexIndex]
		if (polygonSegment != null) {
			var midpoint = Vector.interpolationFromToAlong2D(polygonSegment[0].point, polygonSegment[1].point)
			if (excludeInsidenessSet.has(getPolygonInsideness(midpoint, otherPolygon))) {
				polygonSegments[vertexIndex] = null
			}
		}
	}
}

function nullifyExcludedPoints(excludeInsideness, otherPolygon, polygonSegments) {
	for (var vertexIndex = 0; vertexIndex < polygonSegments.length; vertexIndex++) {
		var polygonSegment = polygonSegments[vertexIndex]
		if (polygonSegment != null) {
			var point = polygonSegment[1].point
			if (excludeInsideness == getPolygonInsideness(point, otherPolygon)) {
				polygonSegments[vertexIndex] = null
				polygonSegments[(vertexIndex + 1) % polygonSegments.length] = null
			}
		}
	}
}

var Polygon = {
ellipseFromToRadius: function(registry, statement, fromPoint, toPoint = 10.0, radius = 1.0, numberOfSides = 24, includeFrom, includeTo) {
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
	var center = Vector.interpolationFromToAlong2D(fromPoint, toPoint)
	var centerFrom = VectorFast.getSubtraction2D(fromPoint, center)
	var centerFromLength = VectorFast.length2D(centerFrom)
	includeFrom = Value.getValueDefault(includeFrom, true)
	includeTo = Value.getValueDefault(includeTo, true)
	var arc = []
	if (includeFrom) {
		arc.push(fromPoint)
	}

	if (centerFromLength == 0.0) {
		return removeUnincluded(arc, includeFrom, includeTo)
	}

	var right = VectorFast.divide2DScalar([centerFrom[1], -centerFrom[0]], centerFromLength * Math.sqrt(centerFromLength))
	var numberOfArcSides = Math.ceil(numberOfSides * 0.5 - gClose)
	var zAddition = undefined
	if (fromPoint.length > 2) {
		zAddition = (toPoint[2] - fromPoint[2]) / numberOfArcSides
		center.push(0.0)
		centerFrom.push(fromPoint[2])
	}

	var rotator = Vector.polarCounterclockwise(Math.PI / numberOfArcSides)
	arc.length = numberOfArcSides
	for (var vertexIndex = 1; vertexIndex < numberOfArcSides; vertexIndex++) {
		VectorFast.rotate2DVector(centerFrom, rotator)
		if (zAddition != undefined) {
			centerFrom[2] += zAddition
		}
		var point = VectorFast.getAdditionArray(center, centerFrom, 3)
		VectorFast.add2D(point, VectorFast.getMultiplication2DScalar(right, VectorFast.dotProduct2D(right, centerFrom) * (radius - centerFromLength)))
		arc[vertexIndex] = point
	}

	if (includeTo) {
		arc.push(toPoint)
	}

	return removeUnincluded(arc, includeFrom, includeTo)
},

ellipseToRadius: function(registry, statement, toPoint, radius, numberOfSides, includeFrom, includeTo) {
	return ellipseFromToRadius(registry, statement, [undefined, undefined], toPoint, radius, numberOfSides, false, includeTo)
},

getDifferenceCircle: function(polygon, center = [0.0, 0.0], radius = 1.0, numberOfSides = gFillet.sides) {
	if (!Polyline.areArraysLong(polygon, 2)) {
		return undefined
	}

	if (polygon.length < 3) {
		return undefined
	}

	var differenceCircle = Polyline.copy(polygon)
	removeIdentical2DPoints(differenceCircle)
	if (differenceCircle.length < 3) {
		return polygon
	}

	var insideCount = 0
	var radiusSquared = radius * radius
	var startIndex = undefined
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var point = differenceCircle[vertexIndex]
		if (VectorFast.distanceSquared2D(point, center) < radiusSquared) {
			differenceCircle[vertexIndex] = undefined
			insideCount++
		}
		else {
			differenceCircle[vertexIndex] = point.slice(0)
			startIndex = vertexIndex
		}
	}

	if (insideCount == 0) {
		return polygon
	}

	if (insideCount == polygon.length) {
		return []
	}

	var arcObject = undefined
	for (var extraIndex = 0; extraIndex < polygon.length; extraIndex++) {
		var vertexIndex = (startIndex + extraIndex) % polygon.length
		if (differenceCircle[vertexIndex] == undefined) {
			var centerPoint = polygon[vertexIndex]
			var beginPoint = differenceCircle[(vertexIndex - 1 + polygon.length) % polygon.length]
			if (beginPoint != undefined) {
				arcObject = {arc:[], outsidePoints:[]}
				Difference.addIntersectionPoint(arcObject, beginPoint, center, centerPoint, radius)
				differenceCircle[vertexIndex] = arcObject
			}
			var endPoint = differenceCircle[(vertexIndex + 1) % polygon.length]
			if (endPoint != undefined) {
				Difference.addIntersectionPoint(arcObject, endPoint, center, centerPoint, radius)
				arcObject = undefined
			}
		}
	}

	var isCounterclockwise = Polygon.isCounterclockwise(polygon)
	Vector.removeUndefineds(differenceCircle)
	for (var vertexIndex = differenceCircle.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = differenceCircle[vertexIndex]
		if (!Array.isArray(point)) {
			differenceCircle.splice(vertexIndex, 1)
			Difference.addIntersectionArc(point, center,  differenceCircle, isCounterclockwise, radius, numberOfSides, vertexIndex)
		}
	}

	return differenceCircle
},

getDifferencePolygon: function(workPolygon, toolPolygon) {
	var differencePolygons = Polygon.getDifferencePolygons(workPolygon, toolPolygon)
	if (differencePolygons == undefined) {
		return undefined
	}

	return getLargestPolygon(differencePolygons)
},

getDifferencePolygons: function(workPolygon, toolPolygon) {
	if (!Polyline.areArraysLong(workPolygon, 2) || !Polyline.areArraysLong(toolPolygon, 2)) {
		return undefined
	}

	if (workPolygon.length < 3 || toolPolygon.length < 3) {
		return undefined
	}

	var isWorkClockwise = Polygon.isClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gDifferenceExclusion, getDirectedPolygon(!isWorkClockwise, toolPolygon), workPolygon)
},

getIntersectionPolygon: function(workPolygon, toolPolygon) {
	var intersectionPolygons = Polygon.getIntersectionPolygons(workPolygon, toolPolygon)
	if (intersectionPolygons == undefined) {
		return undefined
	}

	return getLargestPolygon(intersectionPolygons)
},

getIntersectionPolygons: function(workPolygon, toolPolygon) {
	if (!Polyline.areArraysLong(workPolygon, 2) || !Polyline.areArraysLong(toolPolygon, 2)) {
		return undefined
	}

	if (workPolygon.length < 3 || toolPolygon.length < 3) {
		return undefined
	}

	var isWorkClockwise = Polygon.isClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gIntersectionExclusion, getDirectedPolygon(isWorkClockwise, toolPolygon), workPolygon)
},

getIntersectionPolygonsByTools: function(workPolygon, toolPolygons) {
	var intersectionPolygons = []
	for (var toolPolygon of toolPolygons) {
		Vector.pushArray(intersectionPolygons, Polygon.getIntersectionPolygons(workPolygon, toolPolygon))
	}

	return intersectionPolygons
},

getUnionPolygon: function(workPolygon, toolPolygon) {
	var unionPolygons = Polygon.getUnionPolygons(workPolygon, toolPolygon)
	if (unionPolygons == undefined) {
		return undefined
	}

	return getLargestPolygon(unionPolygons)
},

getUnionPolygons: function(workPolygon, toolPolygon) {
	if (!Polyline.areArraysLong(workPolygon, 2) || !Polyline.areArraysLong(toolPolygon, 2)) {
		return undefined
	}

	if (workPolygon.length < 3 || toolPolygon.length < 3) {
		return undefined
	}

	var isWorkClockwise = Polygon.isClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gUnionExclusion, getDirectedPolygon(isWorkClockwise, toolPolygon), workPolygon)
},

isClockwise: function(polygon) {
	if (polygon.length < 3) {
		return false
	}

	return getDoublePolygonArea(polygon) < 0.0
},

isCounterclockwise: function(polygon) {
	if (polygon.length < 3) {
		return true
	}

	return getDoublePolygonArea(polygon) >= 0.0
}
}

var polygonKit = {
addXIntersectionsByPolygonSegment: function(polygon, segmentBegin, segmentEnd, xIntersections, y) {
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var begin = polygon[vertexIndex]
		var end = polygon[(vertexIndex + 1) % polygon.length]
		polygonKit.addXIntersectionsBySegmentSegment(begin, end, segmentBegin, segmentEnd, xIntersections, y)
	}
},

addXIntersectionsBySegmentSegment: function(begin, end, segmentBegin, segmentEnd, xIntersections, y) {
	if ((begin[1] < y) != (end[1] < y)) {
		var along = (y - begin[1]) / (end[1] - begin[1])
		var xIntersection = (1.0 - along) * begin[0] + along * end[0]
		if (xIntersection >= segmentBegin && xIntersection <= segmentEnd) {
			xIntersections.push(xIntersection)
		}
	}
},

closestIndexByAngle: function(polygon, angle = 0.0, vertexIndexes) {
	if (!Polyline.isLongArray(polygon, 2)) {
		return undefined
	}

	removeIdentical2DPoints(polygon)
	if (polygon.length < 3) {
		return undefined
	}

	if (vertexIndexes == undefined) {
		vertexIndexes = Vector.getSequence(polygon.length)
	}

	var angleVector = Vector.polarCounterclockwise(angle)
	var closestDifference = Number.MAX_VALUE
	var closestIndex = undefined
	for (var vertexIndex of vertexIndexes) {
		var centerEnd = Vector.normalize2D(VectorFast.getSubtraction2D(polygon[(vertexIndex + 1) % polygon.length], polygon[vertexIndex]))
		var angleDifference = VectorFast.distance2D(centerEnd, angleVector)
		if (angleDifference < closestDifference) {
			closestDifference = angleDifference
			closestIndex = vertexIndex
		}
	}

	return closestIndex
},

distanceToPolygon: function(polygon, point) {
	var distance = Number.MAX_VALUE
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		distance = Math.min(getDistanceToLineSegment(polygon[vertexIndex], polygon[(vertexIndex + 1) % polygon.length], point), distance)
	}

	return distance
},

pointOnLineSegment: function(begin, end, point) {
	var delta = VectorFast.getSubtraction2D(end, begin)
	var deltaLength = VectorFast.length2D(delta)
	if (deltaLength == 0.0) {
		return begin
	}

	VectorFast.divide2DScalar(delta, deltaLength)
	delta[1] = -delta[1]
	var rotatedBegin = VectorFast.getRotation2DVector(begin, delta)
	var rotatedPoint = VectorFast.getRotation2DVector(point, delta)
	if (rotatedPoint[0] < rotatedBegin[0]) {
		return begin
	}

	if (rotatedPoint[0] > end[0] * delta[0] - end[1] * delta[1]) {
		return end
	}

	delta[1] = -delta[1]
	return VectorFast.getRotation2DVector([rotatedPoint[0], rotatedBegin[1]], delta)
},

pointOnPolygon: function(polygon, point) {
	var closestDistance = Number.MAX_VALUE
	var closestPoint = undefined
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var begin = polygon[vertexIndex]
		var end = polygon[(vertexIndex + 1) % polygon.length]
		var distance = getDistanceToLineSegment(begin, end, point)
		if (distance < closestDistance) {
			closestDistance = distance
			closestPoint = polygonKit.pointOnLineSegment(begin, end, point)
		}
	}

	return closestPoint
},

pointOnPolygonByAngle: function(polygon, angle = 0.0) {
	removeIdentical2DPoints(polygon)
	var angleDifferences = new Array(polygon.length)
	var angleVector = Vector.polarCounterclockwise(angle)
	var closestDifference = Number.MAX_VALUE
	var closestIndex = undefined
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var centerEnd = Vector.normalize2D(VectorFast.getSubtraction2D(polygon[(vertexIndex + 1) % polygon.length], polygon[vertexIndex]))
		var angleDifference = VectorFast.distance2D(centerEnd, angleVector)
		angleDifferences[vertexIndex] = angleDifference
		if (angleDifference < closestDifference) {
			closestDifference = angleDifference
			closestIndex = vertexIndex
		}
	}

	var along = 0.5
	var endIndex = (closestIndex + 1) % polygon.length
	var beginAngleDifference = angleDifferences[(closestIndex - 1 + polygon.length) % polygon.length]
	var endAngleDifference = angleDifferences[endIndex]
	if (endAngleDifference < beginAngleDifference) {
		along += closestDifference / (closestDifference + endAngleDifference)
	}
	else {
		along -= closestDifference / (closestDifference + beginAngleDifference)
	}

	return Vector.interpolationFromToAlong2D(polygon[closestIndex], polygon[endIndex], along)
},

splitPolygonBySegment: function(polygon, segmentBegin, segmentEnd, y) {
	for (var beginIndex = polygon.length - 1; beginIndex > -1; beginIndex--) {
		var endIndex = (beginIndex + 1) % polygon.length
		polygonKit.splitPolygonBySegmentSegment(beginIndex, endIndex, polygon, segmentBegin, segmentEnd, y)
	}
},

splitPolygonBySegmentSegment: function(beginIndex, endIndex, polygon, segmentBegin, segmentEnd, y) {
	var begin = polygon[beginIndex]
	var end = polygon[endIndex]
	if ((begin[1] < y) != (end[1] < y)) {
		var along = (y - begin[1]) / (end[1] - begin[1])
		var xAlong = (1.0 - along) * begin[0] + along * end[0]
		if (xAlong >= segmentBegin && xAlong <= segmentEnd) {
			polygon.splice(beginIndex + 1, 0, [xAlong, y])
		}
	}
},

splitPolygonBySegmentSegmentX: function(beginIndex, endIndex, polygon, segmentBegin, segmentEnd, x, y) {
	var begin = polygon[beginIndex]
	var end = polygon[endIndex]
	if ((begin[1] < y) != (end[1] < y)) {
		var along = (y - begin[1]) / (end[1] - begin[1])
		var xAlong = (1.0 - along) * begin[0] + along * end[0]
		if (xAlong >= segmentBegin && xAlong <= segmentEnd) {
			polygon.splice(beginIndex + 1, 0, [x, y])
		}
	}
},

splitPolygonBySegmentX: function(polygon, segmentBegin, segmentEnd, x, y) {
	for (var beginIndex = polygon.length - 1; beginIndex > -1; beginIndex--) {
		var endIndex = (beginIndex + 1) % polygon.length
		polygonKit.splitPolygonBySegmentSegmentX(beginIndex, endIndex, polygon, segmentBegin, segmentEnd, x, y)
	}
}
}

function removeClose2DPoints(points) {
	var gridSet = new Set()
	var distantIndex = 0
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var floorX = Math.floor(point[0] * gHalfMinusOver)
		var floorXPlus = floorX + 2
		var floorY = Math.floor(point[1] * gHalfMinusOver)
		var floorYPlus = floorY + 2
		var isFar = true
		for (var x = floorX; x < floorXPlus; x++) {
			for (var y = floorY; y < floorYPlus; y++) {
				var key = x.toString() + ' ' + y.toString()
				if (gridSet.has(key)) {
					isFar = false
					break
				}
			}
		}
		if (isFar) {
			points[distantIndex] = point
			distantIndex += 1
		}
		gridSet.add(Math.round(point[0] * gHalfMinusOver).toString() + ' ' + Math.round(point[1] * gHalfMinusOver).toString())
	}
	points.length = distantIndex
}

function removeCollinearPointsByFacets(collinearities, facets) {
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			if (collinearities[facet[vertexIndex]]) {
				facet[vertexIndex] = undefined
			}
		}
		Vector.removeUndefineds(facet)
	}
}

function removeCollinearPointsByMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var collinearities = new Array(points.length).fill(true)
	for (var facet of facets) {
		addFacetToCollinearities(collinearities, facet, points)
	}

	removeCollinearPointsByFacets(collinearities, facets)
}

function removeCollinearXYPoints(polygon) {
	removeIdentical2DPoints(polygon)
	if (polygon.length < 2) {
		return polygon
	}

	var polygonLengthMinus = polygon.length - 1
	var lastPoint = polygon[polygonLengthMinus]
	var beginPoint = lastPoint
	var zeroPoint = polygon[0]
	for (var vertexIndex = 0; vertexIndex < polygonLengthMinus; vertexIndex++) {
		var centerPoint = polygon[vertexIndex]
		var endPoint = polygon[vertexIndex + 1]
		var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, centerPoint))
		var endCenter = Vector.normalize2D(VectorFast.getSubtraction2D(centerPoint, endPoint))
		if (VectorFast.dotProduct2D(centerBegin, endCenter) > gOneMinusClose) {
			polygon[vertexIndex] = undefined
		}
		else {
			beginPoint = centerPoint
		}
	}

	var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, lastPoint))
	var endCenter = Vector.normalize2D(VectorFast.getSubtraction2D(lastPoint, zeroPoint))
	if (VectorFast.dotProduct2D(centerBegin, endCenter) > gOneMinusClose) {
		polygon[polygonLengthMinus] = undefined
	}

	Vector.removeUndefineds(polygon)
}

function removeConvertCollinearXYPointIndexes(pointIndexes, points, removalStart) {
	if (pointIndexes.length < 2) {
		return undefined
	}

	for (var vertexIndex = pointIndexes.length - 1; vertexIndex > -1; vertexIndex--) {
		if (VectorFast.equal2D(points[pointIndexes[vertexIndex]], points[pointIndexes[(vertexIndex + 1) % pointIndexes.length]])) {
			pointIndexes.splice(vertexIndex, 1)
		}
	}

	if (pointIndexes.length < 2) {
		return undefined
	}

	var polygonLengthMinus = pointIndexes.length - 1
	var lastPointIndex = pointIndexes[polygonLengthMinus]
	var lastPoint = points[lastPointIndex]
	var beginPoint = lastPoint
	var zeroPoint = points[pointIndexes[0]]
	for (var vertexIndex = 0; vertexIndex < polygonLengthMinus; vertexIndex++) {
		var centerPointIndex = pointIndexes[vertexIndex]
		var centerPoint = points[centerPointIndex]
		var endPoint = points[pointIndexes[vertexIndex + 1]]
		var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, centerPoint))
		var endCenter = Vector.normalize2D(VectorFast.getSubtraction2D(centerPoint, endPoint))
		if (VectorFast.dotProduct2D(centerBegin, endCenter) > gOneMinusClose && centerPointIndex >= removalStart) {
			pointIndexes[vertexIndex] = undefined
		}
		else {
			beginPoint = centerPoint
			pointIndexes[vertexIndex] = centerPoint
		}
	}

	var centerBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, lastPoint))
	var endCenter = Vector.normalize2D(VectorFast.getSubtraction2D(lastPoint, zeroPoint))
	if (VectorFast.dotProduct2D(centerBegin, endCenter) > gOneMinusClose && lastPointIndex >= removalStart) {
		pointIndexes[polygonLengthMinus] = undefined
	}
	else {
		pointIndexes[polygonLengthMinus] = lastPoint
	}

	Vector.removeUndefineds(pointIndexes)
}

function removeIdentical2DPoints(polygon) {
	if (polygon.length < 2) {
		return polygon
	}

	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		if (VectorFast.equal2D(polygon[vertexIndex], polygon[(vertexIndex + 1) % polygon.length])) {
			polygon.splice(vertexIndex, 1)
		}
	}

	return polygon
}

function removeIdentical3DPoints(polygon) {
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1] && point[2] == nextPoint[2]) {
			polygon.splice(vertexIndex, 1)
		}
	}
}

function rotateXYZParametersByPoints(rotation, pointList) {
	for (var point of pointList) {
		var original0 = point[0]
		var rotationPlus3 = rotation + 3
		var indexFrom0 = rotationPlus3 % 3
		point[0] = point[indexFrom0]
		var indexFromIndexFrom0 = (rotationPlus3 + indexFrom0) % 3
		point[indexFrom0] = point[indexFromIndexFrom0]
		point[indexFromIndexFrom0] = original0
	}
}

function rotateXYZParametersByPointLists(rotation, pointLists) {
	for (var pointList of pointLists) {
		rotateXYZParametersByPoints(rotation, pointList)
	}
}

function setClosestSquared(closestSquared, gridMap, key, point) {
	if (gridMap.has(key)) {
		var otherPoints = gridMap.get(key)
		for (var otherPoint of otherPoints) {
			var xyDistanceSquared = VectorFast.distanceSquared2D(point, otherPoint)
			if (closestSquared[0] == undefined) {
				closestSquared[0] = otherPoint
				closestSquared[1] = xyDistanceSquared
			}
			else {
				if (xyDistanceSquared < closestSquared[1]) {
					closestSquared[0] = otherPoint
					closestSquared[1] = xyDistanceSquared
				}
			}
		}
	}
}

function setClosestSquaredByXY(closestSquared, gridMap, gridX, gridY, point) {
	setClosestSquared(closestSquared, gridMap, gridX.toString() + ' ' + gridY.toString(), point)
}

function setLinkTop(key, linkMap, top) {
	for (var keyIndex = 0; keyIndex < gLengthLimit; keyIndex++) {
		if (key == top) {
			return
		}
		var nextKey = null
		if (linkMap.has(key)) {
			nextKey = linkMap.get(key)
		}
		linkMap.set(key, top)
		if (nextKey == null) {
			return
		}
		key = nextKey
	}
	warningByList(['In setLinkTop keyIndex = gLengthLimit', key, linkMap, top])
}

function sortAlongIndexesMap(alongIndexesMap) {
	for (var alongIndexes of alongIndexesMap.values()) {
		alongIndexes.sort(Vector.compareElementZeroAscending)
	}
}

function subtractXExistences(xExistences, xNegativeExistences) {
	if (xNegativeExistences == undefined) {
		return xExistences
	}

	var xDensities = new Array(xExistences.length + xNegativeExistences.length)
	for (var xExistenceIndex = 0; xExistenceIndex < xExistences.length; xExistenceIndex += 2) {
		xDensities[xExistenceIndex] = [xExistences[xExistenceIndex], 2]
		xDensities[xExistenceIndex + 1] = [xExistences[xExistenceIndex + 1], -2]
	}

	for (var xNegativeExistenceIndex = 0; xNegativeExistenceIndex < xNegativeExistences.length; xNegativeExistenceIndex += 2) {
		xDensities[xNegativeExistenceIndex + xExistences.length] = [xNegativeExistences[xNegativeExistenceIndex], -2]
		xDensities[xNegativeExistenceIndex + 1 + xExistences.length] = [xNegativeExistences[xNegativeExistenceIndex + 1], 2]
	}

	unionXDensities(xDensities, xExistences)
}

function swap2DPoint(point2D) {
	swapPoint(point2D, 0, 1)
}

function swap2DPolyline(polyline2D) {
	for (var point2D of polyline2D) {
		swap2DPoint(point2D)
	}
}

function swap2DPolylines(polyline2Ds) {
	for (var polyline2D of polyline2Ds) {
		swap2DPolyline(polyline2D)
	}
}

function swapPoint(point, indexA, indexB) {
	var x = point[indexA]
	point[indexA] = point[indexB]
	point[indexB] = x
}

function swapPolyline(polyline, indexA, indexB) {
	for (var point of polyline) {
		swap2DPoint(point, indexA, indexB)
	}
}

function unionXDensities(xDensities, xExistences) {
	xExistences.length = 0
	xDensities.sort(Vector.compareElementZeroAscending)
	var existence = false
	var density = 0
	var oldExistence = false
	for (var xDensity of xDensities) {
		density += xDensity[1]
		existence = density >= 2
		if (existence != oldExistence) {
			var shouldPush = true
			if (xExistences.length > 0) {
				if ((xDensity[0] - xExistences[xExistences.length - 1]) < gClose) {
					shouldPush = false
				}
			}
			if (shouldPush) {
				xExistences.push(xDensity[0])
			}
			else {
				xExistences.pop()
			}
		}
		oldExistence = existence
	}
}

function unionXExistences(xExistences, xOtherExistences) {
	if (xOtherExistences != undefined) {
		Vector.pushArray(xExistences, xOtherExistences)
	}

	unionXExistencesOnly(xExistences)
}

function unionXExistencesOnly(xExistences) {
	var xDensities = new Array(xExistences.length)
	for (var xExistenceIndex = 0; xExistenceIndex < xExistences.length; xExistenceIndex += 2) {
		xDensities[xExistenceIndex] = [xExistences[xExistenceIndex], 2]
		xDensities[xExistenceIndex + 1] = [xExistences[xExistenceIndex + 1], -2]
	}

	unionXDensities(xDensities, xExistences)
}

function xyPointIsCloseToPoints(point, xyPoints) {
	for (var xyPoint of xyPoints) {
		if (VectorFast.distanceSquared2D(point, xyPoint) < gCloseSquared) {
			return true
		}
	}
	return false
}
