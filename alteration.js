//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addConnectedSegmentsToPolygons(meetingMap, polygon, polygons, toolSegments, workSegments) {
	var connectedSegmentArrays = getConnectedSegmentArrays(toolSegments, workSegments)
	convertSegmentArraysToKeyArrays(connectedSegmentArrays)
	for (var extantPolygon of connectedSegmentArrays) {
		removeRepeats(extantPolygon)
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(' ')
			var meetingKey = nodeStrings[1]
			if (nodeStrings[0] == 'w') {
				extantPolygon[nodeStringIndex] = polygon[parseInt(meetingKey)]
			}
			else {
				extantPolygon[nodeStringIndex] = meetingMap.get(meetingKey).point
			}
		}
		if (extantPolygon.length > 2) {
			polygons.push(extantPolygon)
		}
	}
}

function addFilletedPoints(checkLength, filletedPolygon, minimumAngle, numberOfSides, polygon, radius, vertexIndex) {
	var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
	var centerPoint = polygon[vertexIndex]
	var endPoint = polygon[(vertexIndex + 1) % polygon.length]
	var afterPoint = null
	var beforePoint = null
	if (checkLength) {
		beforePoint = polygon[(vertexIndex - 2 + polygon.length) % polygon.length]
		afterPoint = polygon[(vertexIndex + 2) % polygon.length]
	}
	addFilletedPointsByQuintuple(
	beforePoint, beginPoint, centerPoint, endPoint, afterPoint, filletedPolygon, minimumAngle, numberOfSides, radius)
}

function addFilletedPointsByIndex(pointIndex, points, radius, numberOfSides, checkLength) {
	var afterPoint = null
	var beforePoint = null
	var point = points[pointIndex]

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
}

function addFilletedPointsByQuintuple
(beforePoint, beginPoint, centerPoint, endPoint, afterPoint, filletedPolygon, minimumAngle, numberOfSides, radius) {
	var centerBegin = getSubtraction2D(beginPoint, centerPoint)
	var centerBeginLength = length2D(centerBegin)
	var centerEnd = getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = length2D(centerEnd)
	if (centerBeginLength == 0.0 || centerEndLength == 0.0 || radius <= 0.0) {
		filletedPolygon.push(centerPoint)
		return
	}
	divide2DScalar(centerBegin, centerBeginLength)
	divide2DScalar(centerEnd, centerEndLength)
	var twoOverAngle = 2.0 / minimumAngle
	var absoluteHalfCornerAngle = Math.acos(0.5 * distance2D(centerBegin, centerEnd))
	var cornerOverMinimum = twoOverAngle * absoluteHalfCornerAngle
	var numberOfFilletSides = Math.ceil(cornerOverMinimum - gClose)
	if (numberOfFilletSides < 2) {
		filletedPolygon.push(centerPoint)
		return
	}
	var numberOfSidesMinus = numberOfFilletSides - 1
	if (beforePoint != null) {
		var beforeBegin = getSubtraction2D(beginPoint, beforePoint)
		var beforeBeginLength = length2D(beforeBegin)
		if (beforeBeginLength != 0.0) {
			divide2DScalar(beforeBegin, beforeBeginLength)
			var numberOfSideSides = Math.ceil(twoOverAngle * Math.acos(0.5 * distance2D(centerBegin, beforeBegin)) - gClose)
			centerBeginLength *= numberOfSidesMinus / (numberOfSidesMinus + Math.max(0, numberOfSideSides - 1))
		}
		var afterEnd = getSubtraction2D(endPoint, afterPoint)
		var afterEndLength = length2D(afterEnd)
		if (afterEndLength != 0.0) {
			divide2DScalar(afterEnd, afterEndLength)
			var numberOfSideSides = Math.ceil(twoOverAngle * Math.acos(0.5 * distance2D(centerEnd, afterEnd)) - gClose)
			centerEndLength *= numberOfSidesMinus / (numberOfSidesMinus + Math.max(0, numberOfSideSides - 1))
			centerBeginLength = Math.min(centerBeginLength, centerEndLength)
		}
	}
	var centerVector = normalize2D(getAddition2D(centerBegin, centerEnd))
	var dotProduct = dotProduct2D(centerVector, centerBegin)
	var perpendicular = Math.sqrt(1.0 - dotProduct * dotProduct)
	var distanceToTangent = radius * dotProduct / perpendicular
	if (distanceToTangent > centerBeginLength && beforePoint != null) {
		var lengthRatio = centerBeginLength / distanceToTangent
		numberOfFilletSides = Math.ceil(Math.sqrt(lengthRatio) * cornerOverMinimum - gClose)
		if (numberOfFilletSides < 2) {
			filletedPolygon.push(centerPoint)
			return
		}
		radius *= lengthRatio
		distanceToTangent *= lengthRatio
	}
	var halfSideLength = Math.tan(absoluteHalfCornerAngle / numberOfFilletSides) * radius
	var beginTangent = getAddition2D(centerPoint, getMultiplication2DScalar(centerBegin, distanceToTangent - halfSideLength))
	var filletCenter = getAddition2D(centerPoint, getMultiplication2DScalar(centerVector, radius / perpendicular))
	var filletAngle = 2.0 * absoluteHalfCornerAngle / numberOfFilletSides
	if (dotProduct2D([centerBegin[1], -centerBegin[0]], centerEnd) < 0.0) {
		filletAngle = -filletAngle
	}
	filletedPolygon.push(beginTangent)
	var beginTangentCenter = getSubtraction2D(beginTangent, filletCenter)
	var filletRotation = polarCounterclockwise(filletAngle)
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		beginTangentCenter = getRotation2DVector(beginTangentCenter, filletRotation)
		filletedPolygon.push(getAddition2D(filletCenter, beginTangentCenter))
	}
}

function addMirrorPoints(centerDirection, mirrorStart, points) {
	addRotationToCenterDirection(centerDirection)
	var pointZero = points[0]
	var pointStart = points[mirrorStart]
	if (distanceSquared2D(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
		mirrorStart -= 1
	}
	if (points.length > 1) {
		var beginPoint = points[points.length - 2]
		var centerPoint = points[points.length - 1]
		var endPoint = mirrorByCenterDirectionRotation(centerDirection, points[mirrorStart].slice(0))
		var midpoint = getMidpointArray(beginPoint, endPoint)
		if (distanceSquaredArray(centerPoint, midpoint) < gCloseSquared) {
			points.pop()
		}
	}
	for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
		var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
		if (distanceSquared2D(pointZero, mirrorPoint) < gCloseSquared) {
			break
		}
		points.push(mirrorPoint)
	}
	if (points.length > 2) {
		var beginPoint = points[points.length - 1]
		var centerPoint = points[0]
		var endPoint = points[1]
		var midpoint = getMidpointArray(beginPoint, endPoint)
		if (distanceSquaredArray(centerPoint, midpoint) < gCloseSquared) {
			points.splice(0, 1)
		}
	}
}

function addRotationToCenterDirection(centerDirection) {
	var reverseRotation = [centerDirection.direction[0], -centerDirection.direction[1]]
	var lineRotatedY = centerDirection.center[0] * reverseRotation[1] + centerDirection.center[1] * reverseRotation[0]
	centerDirection.reverseRotation = reverseRotation
	centerDirection.mirrorFromY = lineRotatedY + lineRotatedY
}

function addSplitPolygonByHeight(polygon, splitHeight, splitPolygons) {
	var alongIndexesMap = new Map()
	var isCounter = !getIsClockwise(polygon)
	var meetingMap = new Map()
	var toolAlongIndexes = []
	var xMap = new Map()
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var endIndex = (vertexIndex + 1) % polygon.length
		var beginPoint = polygon[vertexIndex]
		var endPoint = polygon[endIndex]
		var meeting = null
		var meetingKey = polygon[vertexIndex] + ';' + polygon[endIndex]
		var workDirection = true
		var reversedKey = polygon[endIndex] + ';' + polygon[vertexIndex]
		if (meetingMap.has(reversedKey)) {
			meetingKey = reversedKey
			meeting = meetingMap.get(meetingKey)
			workDirection = false
		}
		else {
			var meeting = getMeetingByHeight(splitHeight, beginPoint[1], endPoint[1])
		}
		if (meeting != null) {
			var workAlong = meeting.workAlong
			if (workDirection) {
				if (meeting.isWorkNode) {
					if (meeting.workAlong < 0.5) {
						meeting.point = beginPoint.slice(0)
					}
					else {
						meeting.point = endPoint.slice(0)
					}
				}
				else {
					meeting.point = [beginPoint[0] * (1.0 - meeting.workAlong) + endPoint[0] * meeting.workAlong, splitHeight]
				}
				if (xMap.has(meeting.point[0])) {
					meetingKey = xMap.get(meeting.point[0])
					meeting = meetingMap.get(meetingKey)
				}
				else {
					meetingMap.set(meetingKey, meeting)
					xMap.set(meeting.point[0], meetingKey)
				}
			}
			else {
				workAlong = 1.0 - workAlong
			}
			addMeetingToMap(workAlong, alongIndexesMap, meeting.isWorkNode, 'w ', meetingKey, vertexIndex, polygon.length)
			var toolAlong = meeting.point[0]
			if (isCounter) {
				toolAlong = -toolAlong
			}
			toolAlongIndexes.push([toolAlong, meetingKey])
		}
	}
	toolAlongIndexes.sort(compareFirstElementAscending)
	addSplitPolygons(alongIndexesMap, meetingMap, polygon, splitHeight, splitPolygons, toolAlongIndexes)
}

function addSplitPolygons(alongIndexesMap, meetingMap, polygon, splitHeight, splitPolygons, toolSegments) {
	if (meetingMap.size == 0) {
		splitPolygons.push(polygon)
		return
	}
	sortAlongIndexesMap(alongIndexesMap)
	var bottomSegments = getPolygonSegments(alongIndexesMap, meetingMap, polygon, 'w')
	var topSegments = getTopSegments(1, bottomSegments, splitHeight)
	for (var toolSegmentIndex = 0; toolSegmentIndex < toolSegments.length; toolSegmentIndex++) {
		var meetingKey = toolSegments[toolSegmentIndex][1]
		toolSegments[toolSegmentIndex] = [{nodeKey:'m ' + meetingKey, point:meetingMap.get(meetingKey).point}]
	}
	for (var toolSegmentIndex = 0; toolSegmentIndex < toolSegments.length - 1; toolSegmentIndex++) {
		toolSegments[toolSegmentIndex].push(toolSegments[toolSegmentIndex + 1][0])
	}
	toolSegments.pop()
	addConnectedSegmentsToPolygons(meetingMap, polygon, splitPolygons, toolSegments, bottomSegments)
	toolSegments.reverse()
	reverseArrays(toolSegments)
	addConnectedSegmentsToPolygons(meetingMap, polygon, splitPolygons, toolSegments, topSegments)
}

function addSplitPolygonsByHeight(polygons, splitHeight, splitPolygons) {
	for (var polygon of polygons) {
		addSplitPolygonByHeight(polygon, splitHeight, splitPolygons)
	}
}

function addSplitPolygonsByHeights(polygons, splitHeights, splitPolygons) {
	for (var splitHeight of splitHeights) {
		addSplitPolygonsByHeight(polygons, splitHeight, splitPolygons)
	}
}

function addToRegion(region, regionID, registry, statement) {
	if (regionID == 'this') {
		var polygons = []
		for (var child of statement.children) {
			pushArray(polygons, getPolygonsHDRecursively(registry, child))
		}
		if (polygons.length > 0) {
			pushArray(region.polygons, polygons)
		}
		else {
			noticeByList(['No polygons could be found for addToRegion in alteration.', regionID, statement])
		}
		return
	}

	if (regionID.startsWith('equation.')) {
		var equation = getVariableValue(regionID.slice('equation.'.length), statement)
		if (getIsEmpty(equation)) {
			noticeByList(['No equation could be found for addToRegion in alteration.', regionID, statement])
		}
		else {
			region.equations.push(equation)
		}
		return
	}

	if (regionID.startsWith('point.')) {
		var point = getValueByEquation(registry, statement, regionID.slice('point.'.length))
		if (getIsEmpty(point)) {
			noticeByList(['No point could be found for addToRegion in alteration.', regionID, statement])
		}
		else {
			region.pointStringSet.add(point.slice(0,2).toString())
		}
		return
	}

	if (!registry.idMap.has(regionID)) {
		noticeByList(['No statement could be found for addToRegion in alteration.', regionID, statement])
		return
	}
	var regionStatement = registry.idMap.get(regionID)
	var polygons = getPolygonsHDRecursively(registry, regionStatement)

	if (polygons.length > 0) {
		pushArray(region.polygons, polygons)
		return
	}
	var polylines = getChainPointListsHDRecursively(regionStatement, 1, registry, regionStatement, 'polyline')

	if (polylines.length == 0) {
		noticeByList(['No polygons or polylines could be found for addToRegion in alteration.', regionID, statement])
		return
	}

	for (var polyline of polylines) {
		for (var point of polyline) {
			region.pointStringSet.add(point.slice(0,2).toString())
		}
	}
}

function alterMeshExcept(mesh, registry, statement) {
//	if (statement.attributeMap.has('alteration')) {
//		var alterations = statement.attributeMap.get('alteration').replace(/,/g, ' ').split(' ').filter(lengthCheck)

//deprecated24
	if (statement.attributeMap.has('alteration') || statement.attributeMap.has('alterations')) {
		var alterations = null
		if (statement.attributeMap.has('alteration')) {
			alterations = statement.attributeMap.get('alteration').replace(/,/g, ' ').split(' ').filter(lengthCheck)
		}
		else {
			alterations = statement.attributeMap.get('alterations').replace(/,/g, ' ').split(' ').filter(lengthCheck)
		}

		for (var alteration of alterations) {
			alteration = alteration.trim()
			if (gAlterMeshMap.has(alteration)) {
				gAlterMeshMap.get(alteration).alterMesh(mesh, registry, statement)
			}
		}
	}
}

//deprecated
function analyzeOutputMesh(mesh, registry, statement) {
	var id = statement.attributeMap.get('id')
	registry.meshMap.set(id, mesh)
	alterMeshExcept(mesh, registry, statement)
}

function bevelPoints(bevels, mesh, pointIndexSet, points) {
	var facets = mesh.facets
//	bevels = getPushArray(bevels, splits)
	if (bevels == null) {
		return
	}
	bevels.sort(compareFirstElementAscending)
	for (var bevel of bevels) {
		if (bevel.length == 1) {
			bevel.push(bevel[0])
		}
		if (bevel.length == 2) {
			bevel.push(0.0)
		}
	}
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != null) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				if (pointIndexSet.has(pointIndex)) {
					normal.push(facetIndex)
					for (var pointIndex of facet) {
						addElementToMapArray(normal, pointIndex, horizontalDirectionMap)
					}
					break
				}
			}
		}
	}
	var bevelMap = new Map()
	for (var pointIndex of pointIndexSet) {
		var point = points[pointIndex]
		if (point == undefined) {
			noticeByList(['point is undefined in pointIndexSet in alteration.', points, pointIndex, pointIndexSet])
			return
		}
		var interpolationAlong = getFlatInterpolationAlongBeginEnd(point[2], bevels)
		var along = interpolationAlong[0]
		var lower = interpolationAlong[1]
		var upper = interpolationAlong[2]
		var oneMinus = 1.0 - along
		var inset = [oneMinus * lower[0] + along * upper[0], oneMinus * lower[1] + along * upper[1]]
		var unitVectors = horizontalDirectionMap.get(pointIndex)
		var horizontalVectorIndex = null
		var smallestZ = Number.MAX_VALUE
		for (var unitVectorIndex = 0; unitVectorIndex < unitVectors.length; unitVectorIndex++) {
			var z = Math.abs(unitVectors[unitVectorIndex][2])
			if (z < smallestZ) {
				smallestZ = z
				horizontalVectorIndex = unitVectorIndex
			}
		}
		var horizontalVector = unitVectors[horizontalVectorIndex]
		var highestCrossProductZ = -Number.MAX_VALUE
		var highestCrossVector = horizontalVector
		var maximumZ = smallestZ + 0.5
		for (var unitVectorIndex = 0; unitVectorIndex < unitVectors.length; unitVectorIndex++) {
			if (unitVectorIndex != horizontalVectorIndex) {
				var otherVector = unitVectors[unitVectorIndex]
				var crossProductZ = Math.abs(crossProduct2D(horizontalVector, otherVector))
				crossProductZ += gClose * Math.abs(dotProduct2D(horizontalVector, otherVector))
				if (crossProductZ > highestCrossProductZ && Math.abs(otherVector[2]) < maximumZ) {
					highestCrossProductZ = crossProductZ
					highestCrossVector = otherVector
				}
			}
		}
		var addition = getAddition2D(normalize2D(horizontalVector.slice(0, 2)), normalize2D(highestCrossVector.slice(0, 2)))
		bevelMap.set(pointIndex, getMultiplication2D(multiply2DScalar(addition, -2.0 / lengthSquared2D(addition)), inset))
	}
	for (var pointIndex of bevelMap.keys()) {
		add2D(points[pointIndex], bevelMap.get(pointIndex))
	}
}

function expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh) {
	if (mesh == null) {
		return
	}
	if (expansionXY.length == 1) {
		expansionXY.push(expansionXY[0])
	}
	var facets = mesh.facets
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	for (var key of horizontalDirectionMap.keys()) {
		add2D(mesh.points[key], getMultiplication2D(horizontalDirectionMap.get(key), expansionXY))
	}
	var bottomOverDeltaZ = expansionBottom / directionMapZ.deltaZ
	var topOverDeltaZ = expansionTop / directionMapZ.deltaZ
	var zAddition = - directionMapZ.minimumZ * topOverDeltaZ - directionMapZ.maximumZ * bottomOverDeltaZ
	var zMultiplier = topOverDeltaZ + bottomOverDeltaZ
	for (var point of mesh.points) {
		point[2] += point[2] * zMultiplier + zAddition
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), mesh.points)
}

function getBoundedPoints2D(points, region, registry, statement) {
	if (getIsEmpty(region)) {
		return points
	}
	var pointIndexSet = new Set()
	addPointsToIndexSet(pointIndexSet, points, region.polygons)
	return getBoundedPointsBySet(pointIndexSet, points)
}

function getBoundedPointsBySet(pointIndexSet, points) {
	var boundedPoints = []
	for (var pointIndex of pointIndexSet) {
		boundedPoints.push(points[pointIndex])
	}
	return boundedPoints
}

function getCenterDirection(registry, statement, tag) {
	var direction = getFloatsByDefault(undefined, 'direction', registry, statement, tag)
	return getCenterDirectionByCenterDirection(getFloatsByDefault(undefined, 'center', registry, statement, tag), direction)
}

function getCenterDirectionByCenterDirection(center, direction) {
	if (getIsEmpty(center) && getIsEmpty(direction)) {
		return null
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	center[0] = getValueByDefault(0.0, center[0])
	center[1] = getValueByDefault(0.0, center[1])
	if (getIsEmpty(direction)) {
		if (center[0] == 0.0 && center[1] == 0.0) {
			return {center:center, direction:[1.0, 0.0]}
		}
		return {center:center, direction:normalize2D([-center[1], center[0]])}
	}
	direction[0] = getValueByDefault(0.0, direction[0])
	if (direction.length == 1) {
		return {center:center, direction:polarCounterclockwise(direction[0] * gRadiansPerDegree)}
	}
	direction[1] = getValueByDefault(0.0, direction[1])
	var directionLength = length2D(direction)
	if (directionLength == 0.0) {
		return {center:center, direction:[1.0, 0.0]}
	}
	return {center:center, direction:divide2DScalar(direction, directionLength)}
}

function getCenterDirectionMirrorStart(mirrorStart, points) {
	if (points.length < 2) {
		return {center:center, direction:[1.0, 0.0], mirrorStart:mirrorStart}
	}
	var penultimatePoint = points[points.length - 2]
	var ultimatePoint = points[points.length - 1]
	var direction = getSubtraction2D(ultimatePoint, penultimatePoint)
	direction = [direction[1], -direction[0]]
	perpendicular = multiply2DScalar(getAddition2D(penultimatePoint, ultimatePoint), 0.5)
	var directionLength = length2D(direction)
	if (directionLength == 0.0) {
		direction = [1.0, 0.0]
	}
	else {
		divide2DScalar(direction, directionLength)
	}
	return {center:perpendicular.slice(0), direction:direction.slice(0), mirrorStart:mirrorStart - 2}
}

function getDirectionMapZ(facets, points) {
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != null) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				addElementToMapArray(normal, pointIndex, horizontalDirectionMap)
			}
		}
	}
	var minimumZ = Number.MAX_VALUE
	var maximumZ = -Number.MAX_VALUE
	for (var key of horizontalDirectionMap.keys()) {
		var z = points[key][2]
		minimumZ = Math.min(minimumZ, z)
		maximumZ = Math.max(maximumZ, z)
		var unitVectors = horizontalDirectionMap.get(key)
		unitVectors.sort(compareAbsoluteElementTwoAscending)
		var addition = getAddition2D(normalize2D(unitVectors[0]), normalize2D(unitVectors[1]))
		horizontalDirectionMap.set(key, multiply2DScalar(addition, 2.0 / lengthSquared2D(addition)))
	}
	return {deltaZ:maximumZ - minimumZ, horizontalDirectionMap:horizontalDirectionMap , minimumZ:minimumZ, maximumZ:maximumZ}
}

function getDotProduct2DRange(points, vector) {
	if (points.length == 0) {
		return [0.0, 0.0]
	}
	var minimumDotProduct = Number.MAX_VALUE
	var maximumDotProduct = -Number.MAX_VALUE
	for (var point of points) {
		var dotProduct = dotProduct2D(point, vector)
		minimumDotProduct = Math.min(minimumDotProduct, dotProduct)
		maximumDotProduct = Math.max(maximumDotProduct, dotProduct)
	}
	return [minimumDotProduct, maximumDotProduct]
}

function getDotProduct3DRange(points, vector) {
	if (points.length == 0) {
		return [0.0, 0.0]
	}
	var minimumDotProduct = Number.MAX_VALUE
	var maximumDotProduct = -Number.MAX_VALUE
	for (var point of points) {
		var dotProduct = dotProduct3D(point, vector)
		minimumDotProduct = Math.min(minimumDotProduct, dotProduct)
		maximumDotProduct = Math.max(maximumDotProduct, dotProduct)
	}
	return [minimumDotProduct, maximumDotProduct]
}

function getFilletedPolygon(numberOfSides, polygon, radius, checkLength) {
	checkLength = getValueByDefault(true, checkLength)
	var filletedPolygon = []
	var minimumAngle = gDoublePi / numberOfSides
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		addFilletedPoints(checkLength, filletedPolygon, minimumAngle, numberOfSides, polygon, radius, vertexIndex)
	}
	return filletedPolygon
}

function getFlatInterpolationAlongBeginEnd(x, points) {
	var beginPoint = points[0]
	if (points.length == 1) {
		return [0.0, points[0], points[0]]
	}
	if (x <= beginPoint[0]) {
		return [0.0, points[0], points[0]]
	}
	var upperIndex = points.length - 1
	if (x >= points[upperIndex][0]) {
		return [0.0, points[upperIndex], points[upperIndex]]
	}
	return getInsideInterpolationAlongBeginEnd(x, points)
}

function getInsideInterpolationAlongBeginEnd(x, points) {
	var lowerIndex = 0
	var upperIndex = points.length - 1
	for (var whileTestIndex = 0; whileTestIndex < gLengthLimit; whileTestIndex++) {
		var difference = upperIndex - lowerIndex
		if (difference < 2) {
			var lowerPoint = points[lowerIndex]
			var run = points[upperIndex][0] - lowerPoint[0]
			if (run == 0.0) {
				return [0.0, points[lowerIndex], points[lowerIndex]]
			}
			var along = (x - lowerPoint[0]) / run
			return [along, points[lowerIndex], points[upperIndex]]
		}
		var middleIndex = lowerIndex + Math.round(difference / 2)
		if (x < points[middleIndex][0]) {
			upperIndex = middleIndex
		}
		else {
			lowerIndex = middleIndex
		}
	}
	return null
}

function getOutsetPolygons(points, registry, statement, tag) {
	var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
	var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, tag)
	var clockwise = getBooleanByStatement('clockwise', registry, statement)
	if (clockwise == undefined) {
		clockwise = getIsClockwise(points)
	}
	var markerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, tag)
	var marker = getPointsByKey('marker', registry, statement)
	var baseMarker = getPointsByKey('baseMarker', registry, statement)
	var tipMarker = getPointsByKey('tipMarker', registry, statement)
	if (getIsEmpty(baseMarker)) {
		baseMarker = marker
	}
	if (getIsEmpty(tipMarker)) {
		tipMarker = marker
	}
	var outsets = getOutsets(registry, statement, tag)
	return getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, points, tipMarker)
}

function getOutsets(registry, statement, tag) {
	var outsets = getPointsByKey('outsets', registry, statement)
	if (getIsEmpty(outsets)) {
		var outset = getPointByDefault([1.0, 1.0], 'radius', registry, statement, tag)
		outset = getPointByDefault(outset, 'outset', registry, statement, tag)
		outsets = [outset]
	}
	else {
		for (var outset of outsets) {
			if (outset.length == 1) {
				outset.push(outset[0])
			}
		}
	}
	return outsets
}

function getPointIndexSet(antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas) {
	var pointIndexSet = new Set()

	if (getIsEmpty(intersectionIDs) && region == undefined && getIsEmpty(splitIDs)) {
		if (getIsEmpty(stratas)) {
			addRangeToSet(pointIndexSet, 0, points.length)
		}
		else {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var z = points[pointIndex][2]
				for (var strata of stratas) {
					if (getIsInStrata(strata, z)) {
						pointIndexSet.add(pointIndex)
					}
				}
			}
		}
		return pointIndexSet
	}

	if (mesh.intersectionIndexesMap != undefined) {
		for (var id of intersectionIDs) {
			if (mesh.intersectionIndexesMap.has(id)) {
				addElementsToSet(mesh.intersectionIndexesMap.get(id), pointIndexSet)
			}
		}
	}

	if (mesh.splitIndexesMap != undefined) {
		for (var id of splitIDs) {
			if (mesh.splitIndexesMap.has(id)) {
				addElementsToSet(mesh.splitIndexesMap.get(id), pointIndexSet)
			}
		}
	}

	if (region != undefined) {
		for (var polygon of region.polygons) {
			var boundingBox = getBoundingBox(polygon)
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (getIsInStratas(stratas, point[2])) {
					if (isPointInsideBoundingBoxPolygonOrClose(boundingBox, point, polygon)) {
						pointIndexSet.add(pointIndex)
					}
				}
			}
		}
		if (region.pointStringSet.size > 0) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				if (region.pointStringSet.has(points[pointIndex].slice(0,2).toString())) {
					pointIndexSet.add(pointIndex)
				}
			}
		}
		if (region.equations.length > 0) {
			var variableMap = getVariableMapByStatement(statement)
			for (var equation of region.equations) {
				for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
					var point = points[pointIndex]
					if (getIsInStratas(stratas, point[2])) {
						variableMap.set('point', point.toString())
						if (getValueByEquation(registry, statement, equation)) {
							pointIndexSet.add(pointIndex)
						}
					}
				}
			}
		}
	}
	removePointsFromIndexSetByAntiregion(antiregion, pointIndexSet, points)
	return pointIndexSet
}

function getPointIndexSetByOutside(center, isOutside, points, mesh) {
	var pointIndexSet = new Set()
	for (var facet of mesh.facets) {
		var facetCenter = getCenter(facet, points)
		var normal = getNormalByFacet(facet, points)
		var centerFacet = getSubtraction2D(facetCenter, center)
		var centerFacetLength = length2D(centerFacet)
		if (centerFacetLength > 0.0) {
			divide3DScalar(centerFacet, centerFacetLength)
		}
		var dotProduct = dotProduct2D(normal, centerFacet)
		if (Math.abs(dotProduct) > gClose) {
			if (dotProduct > 0.0 == isOutside) {
				for (var pointIndex of facet) {
					pointIndexSet.add(pointIndex)
				}
			}
		}
	}
	return pointIndexSet
}

function getPointsExcept(points, registry, statement) {
//	if (statement.attributeMap.has('alteration')) {
//		var alterations = statement.attributeMap.get('alteration').split(',').filter(lengthCheck)

//deprecated24
	if (statement.attributeMap.has('alteration') || statement.attributeMap.has('alterations')) {
		var alterations = null
		if (statement.attributeMap.has('alteration')) {
			alterations = statement.attributeMap.get('alteration').replace(/,/g, ' ').split(' ').filter(lengthCheck)
		}
		else {
			alterations = statement.attributeMap.get('alterations').replace(/,/g, ' ').split(' ').filter(lengthCheck)
		}

		for (var alteration of alterations) {
			if (gGetPointsMap.has(alteration)) {
				points = gGetPointsMap.get(alteration).getPoints(points, registry, statement)
			}
		}
	}
	return points
}

function getRegion(key, registry, statement) {
	var value = getAttributeValue(key, statement)
	if (value == undefined) {
		return undefined
	}
	var regionIDs = value.split(' ').filter(lengthCheck)
	var region = {equations:[], polygons:[], pointStringSet:new Set()}
	for (var regionID of regionIDs) {
		addToRegion(region, regionID, registry, statement)
	}
	return region
}

function getTopSegments(parameterIndex, polygonSegments, splitHeight) {
	var topSegments = new Array(polygonSegments.length).fill(null)
	for (var vertexIndex = 0; vertexIndex < polygonSegments.length; vertexIndex++) {
		var polygonSegment = polygonSegments[vertexIndex]
		if (polygonSegment != null) {
			var midpointZ = 0.5 * (polygonSegment[0].point[parameterIndex] + polygonSegment[1].point[parameterIndex])
			if (midpointZ > splitHeight) {
				topSegments[vertexIndex] = polygonSegments[vertexIndex]
				polygonSegments[vertexIndex] = null
			}
		}
	}
	return topSegments
}

function mirrorByCenterDirectionRotation(centerDirection, point) {
	rotate2DVector(point, centerDirection.reverseRotation)
	point[1] = centerDirection.mirrorFromY - point[1]
	return rotate2DVector(point, centerDirection.direction)
}

function mirrorMesh(centerDirection, matrix3D, mesh) {
	addRotationToCenterDirection(centerDirection)
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	for (var point of mesh.points) {
		mirrorByCenterDirectionRotation(centerDirection, point)
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), mesh.points)
	for (var facet of mesh.facets) {
		facet.reverse()
	}
}

function setPointsExcept(points, registry, statement) {
	setPointsHD(getPointsExcept(points, registry, statement), statement)
}

function splitMesh(boundaryEquations, id, matrix3D, mesh, polygons, registry, splitHeights, statement, stratas) {
	if (mesh == null || getIsEmpty(splitHeights)) {
		return
	}
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	var facets = mesh.facets
	var points = mesh.points
	if (getIsEmpty(boundaryEquations) && getIsEmpty(polygons)) {
		addSplitIndexes(id, splitHeights, mesh)
	}
	else {
		for (var splitHeight of splitHeights) {
			var facetIndexSet = new Set()
			if (boundaryEquations != null) {
				var variableMap = getVariableMapByStatement(statement)
				for (var boundaryEquation of boundaryEquations) {
					for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
						var facet = facets[facetIndex]
						for (var pointIndex of facet) {
							variableMap.set('point', points[pointIndex].toString())
							if (getValueByEquation(registry, statement, boundaryEquation)) {
								facetIndexSet.add(facetIndex)
								break
							}
						}
					}
				}
			}
			if (polygons != null) {
				for (var polygon of polygons) {
					for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
						if (getPolygonCrossesHeights(polygon, splitHeight, getPolygonByFacet(facets[facetIndex], points), stratas)) {
							facetIndexSet.add(facetIndex)
						}
					}
				}
			}
			addSplitIndexesByFacetSet(facetIndexSet, id, splitHeight, mesh)
		}
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), mesh.points)
}

function taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle) {
	if (mesh == null) {
		return
	}
	var facets = mesh.facets
	if (facets.length == 0) {
		return
	}
	overhangAngle *= gRadiansPerDegree
	sagAngle *= gRadiansPerDegree
	var originalPoints = mesh.points
	var inversePoints = get3DsBy3DMatrix(matrix3D, originalPoints)
	var highestFacetIndex = 0
	var highestFacetZ = -Number.MAX_VALUE
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var minimumZ = Number.MAX_VALUE
		for (var pointIndex of facet) {
			minimumZ = Math.min(minimumZ, inversePoints[pointIndex][2])
		}
		if (minimumZ > highestFacetZ) {
			highestFacetZ = minimumZ
			highestFacetIndex = facetIndex
		}
	}
	var highestFacet = facets[highestFacetIndex].reverse()
	var highestPolygon = getPolygonByFacet(highestFacet, inversePoints)
	var maximumInset = getMaximumInset(highestPolygon)
	var sagSlope = -Math.tan(sagAngle)
	var overhangSlope = Math.tan(0.5 * Math.PI - overhangAngle)
	var approachRunOverRise = 1.0 / overhangSlope - 1.0 / sagSlope
	var inset = Math.max(maximumInset / approachRunOverRise, maximumInset - 0.5 * maximumSpan)
	var insetPolygon = getOutsetPolygon([-inset, -inset], highestPolygon)
	var height = overhangSlope * inset + highestFacetZ
	var insetFacet = new Array(highestFacet.length)
	var pointsLength = inversePoints.length
	pushArray(inversePoints, insetPolygon)
	for (var vertexIndex = 0; vertexIndex < highestFacet.length; vertexIndex++) {
		insetFacet[vertexIndex] = pointsLength
		inversePoints[pointsLength][2] = height
		pointsLength += 1
	}
	addFacetsByBottomTopFacet(highestFacet, facets, insetFacet)
	facets[highestFacetIndex] = insetFacet.reverse()
	pushArray(originalPoints, get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), inversePoints.slice(originalPoints.length, inversePoints.length)))
	mesh.points = originalPoints
}

function threadPointByAxials(axials, center, heights, point, taperAngle, translations) {
	var centerPoint = getSubtraction2D(point, center)
	var centerPointLength = length2D(centerPoint)
	if (centerPointLength == 0.0) {
		return
	}
	var angle = Math.atan2(centerPoint[1], centerPoint[0]) * gDegreesPerRadian
	if (angle < axials[0][0]) {
		angle += 360.0
	}
	else {
		if (angle > axials[axials.length - 1][0]) {
			angle -= 360.0
		}
	}
	if (angle < axials[0][0]) {
		return
	}
	if (angle > axials[axials.length - 1][0]) {
		return
	}
	var bottom = translations[0][0]
	var radialMultiplier = 1.0
	var top = translations[translations.length - 1][0]
	var deltaZ = top - bottom
	var z = point[2]
	var axialInterpolation = additionInterpolation3D(angle, axials)
	var cycle = 0
	var angleDifference = angle - axials[0][0]
	if (angleDifference < taperAngle) {
		radialMultiplier = angleDifference / taperAngle
	}
	else {
		angleDifference = axials[axials.length - 1][0] - angle
		if (angleDifference < taperAngle) {
			radialMultiplier = angleDifference / taperAngle
		}
	}
	z -= axialInterpolation[1]
	if (Math.abs(deltaZ) > 0.0) {
		var axialBottom = Number.MAX_VALUE
		var axialTop = -Number.MAX_VALUE
		for (var axial of axials) {
			axialBottom = Math.min(axialBottom, axial[1])
			axialTop = Math.max(axialTop, axial[1])
		}
		axialBottom += bottom
		axialTop += top
		if (z > top) {
			cycle += Math.ceil((z - top) / deltaZ)
		}
		else {
			if (bottom > z) {
				cycle -= Math.ceil((bottom - z) / deltaZ)
			}
		}
		z -= deltaZ * cycle
		if (!getIsEmpty(heights)) {
			var cycleEnd = cycle - (heights[0] - bottom) / deltaZ
			if (cycleEnd < gClose) {
				return
			}
			if (heights.length > 1) {
				cycleEnd = (heights[1] - axialTop) / deltaZ - cycle
				if (cycleEnd < gClose) {
					return
				}
			}
		}
	}
	var interpolation = additionInterpolation3D(z, translations)
	multiply2DScalar(centerPoint, radialMultiplier * (interpolation[1] + axialInterpolation[2]) / centerPointLength)
	add2D(point, centerPoint)
	var rotationVector = polarCounterclockwise(interpolation[2] * gRadiansPerDegree)
	subtract2D(point, center)
	rotate2DVector(point, rotationVector)
	add2D(point, center)
	point[2] += interpolation[0]
}

function threadPointByTranslations(center, heights, numberOfThreads, point, taperPortion, translations) {
	var centerPoint = getSubtraction2D(point, center)
	var centerPointLength = length2D(centerPoint)
	if (centerPointLength == 0.0) {
		return
	}
	var bottom = translations[0][0]
	var radialMultiplier = 1.0
	var top = translations[translations.length - 1][0]
	var deltaZ = top - bottom
	var z = point[2]
	var angle = Math.atan2(centerPoint[1], centerPoint[0])
	if (angle < 0.0) {
		angle += gDoublePi
	}
	var cycle = numberOfThreads * angle / gDoublePi
	z -= deltaZ * cycle
	if (Math.abs(deltaZ) > 0.0) {
		if (z > top) {
			var above = Math.ceil((z - top) / deltaZ)
			cycle += above
			z -= deltaZ * above
		}
		else {
			if (bottom > z) {
				var below = Math.ceil((bottom - z) / deltaZ)
				cycle -= below
				z += deltaZ * below
			}
		}
		if (!getIsEmpty(heights)) {
			var cycleEnd = cycle - (heights[0] - bottom) / deltaZ
			if (cycleEnd < gClose) {
				return
			}
			if (cycleEnd < taperPortion) {
				radialMultiplier = cycleEnd / taperPortion
			}
			if (heights.length > 1) {
				cycleEnd = (heights[1] - top) / deltaZ - cycle
				if (cycleEnd < gClose) {
					return
				}
				if (cycleEnd < taperPortion) {
					radialMultiplier = cycleEnd / taperPortion
				}
			}
		}
	}
	var interpolation = additionInterpolation3D(z, translations)
	multiply2DScalar(centerPoint, radialMultiplier * interpolation[1] / centerPointLength)
	add2D(point, centerPoint)
	var rotationVector = polarCounterclockwise(interpolation[2] * gRadiansPerDegree)
	subtract2D(point, center)
	rotate2DVector(point, rotationVector)
	add2D(point, center)
	point[2] += interpolation[0]
}

function threadPoints(axials, center, heights, numberOfThreads, points, taperAngle, translations) {
	var maximumLength = 0
	for (var translation of translations) {
		maximumLength = Math.max(maximumLength, translation.length)
	}
	for (var translation of translations) {
		translation.length = maximumLength
		setUndefinedElementsToValue(translation, 0)
	}
	if (getIsEmpty(axials)) {
		var taperPortion = taperAngle / 360.0
		console.log(center)
		console.log(points)
		console.log(translations)
		for (var point of points) {
			threadPointByTranslations(center, heights, numberOfThreads, point, taperPortion, translations)
		}
		return
	}
	maximumLength = 2
	for (var axial of axials) {
		maximumLength = Math.max(maximumLength, axial.length)
	}
	for (var axial of axials) {
		axial.length = maximumLength
		setUndefinedElementsToValue(axial, 0)
	}
	for (var point of points) {
		threadPointByAxials(axials, center, heights, point, taperAngle, translations)
	}

}

function transformPoints2DByEquation(center, points, registry, statement, translationEquations, translations, vector) {
	if (!getIsEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point.toString())
				var value = getValueByEquation(registry, statement, translationEquation)
				if (value != null) {
					if (Array.isArray(value)) {
						if (value.length == 1) {
							value.push(0.0)
						}
					}
					else {
						value = [value, 0.0]
					}
					add2D(point, value)
				}
			}
		}
	}
	if (getIsEmpty(translations)) {
		return
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (vector.length == 1) {
		vector.push(0.0)
	}
	normalize2D(vector)
	for (var point of points) {
		add2D(point, additionInterpolation2D(dotProduct2D(vector, getSubtraction2D(point, center)), translations))
	}
}

function transformPoints3DByEquation(center, points, registry, statement, translationEquations, translations, vector) {
	if (!getIsEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point.toString())
				var value = getValueByEquation(registry, statement, translationEquation)
				if (value != null) {
					if (Array.isArray(value)) {
						if (value.length < 2) {
							value.push(0.0)
						}
						if (value.length < 3) {
							value.push(0.0)
						}
					}
					else {
						value = [value, 0.0, 0.0]
					}
					add3D(point, value)
				}
			}
		}
	}
	if (getIsEmpty(translations)) {
		return
	}
	for (var point of points) {
		add3D(point, additionInterpolation3D(dotProduct3D(vector, getSubtraction3D(point, center)), translations))
	}
}

function wedgeMesh(inset, matrix3D, mesh) {
	if (mesh == null) {
		return
	}
	if (inset.length == 1) {
		inset = [inset[0], inset[0]]
	}
	var facets = mesh.facets
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	var oneOverDeltaZ = 1.0 / directionMapZ.deltaZ
	for (var key of horizontalDirectionMap.keys()) {
		var centerPoint = mesh.points[key]
		var insetAtZ = getMultiplication2DScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = add2D(centerPoint.slice(0), getMultiplication2D(horizontalDirectionMap.get(key), insetAtZ))
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), mesh.points)
}

var gBend = {
	alterMesh: function(mesh, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var intersectionIDs = getStrings('intersectionID', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsBy3DMatrix(matrix3D, mesh.points)
		var region = getRegion('region', registry, statement)
		var splitIDs = getStrings('splitID', statement)
		var stratas = getStratas(registry, statement)
		var pointIndexSet = getPointIndexSet(antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}
		var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
		var translations = getPointsByKey('translation', registry, statement)
		var center = getFloatsByDefault([0.0, 0.0, 0.0], 'center', registry, statement, statement.tag)
		var translationEquations = getEquations('translationEquation', statement)
		var vector = getVector3DByStatement(registry, statement)
		transformPoints3DByEquation(center, boundedPoints, registry, statement, translationEquations, translations, vector)
		mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), points)
		removeClosePoints(mesh)
	},
	getPoints: function(points, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)

		var region = getRegion('region', registry, statement)
		var boundedPoints = getBoundedPoints2D(points, region, registry, statement)
		if (getIsEmpty(boundedPoints)) {
			return points
		}
		var translations = getPointsByKey('translation', registry, statement)
		var center = getFloatsByDefault([0.0, 0.0], 'center', registry, statement, statement.tag)
		var translationEquations = getEquations('translationEquation', statement)
		var vector = getPoint3DByStatement('vector', registry, statement)
		transformPoints2DByEquation(center, boundedPoints, registry, statement, translationEquations, translations, vector)
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'bend',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in bend in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		noticeByList(['No work mesh or points could be found for bend in alteration.', statement])
	}
}

var gBevel = {
	alterMesh: function(mesh, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var bevels = getPointsByKey('bevel', registry, statement)
		var intersectionIDs = getStrings('intersectionID', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsBy3DMatrix(matrix3D, mesh.points)

		//deprecated24
//		var polygons = getPolygonsHDRecursively(registry, statement)

//		var splitBevels = getPointsByKey('splitBevel', registry, statement)
//		if (getIsEmpty(splitBevels)) {
//			splitBevels = getPointsByKey('splitBevels', registry, statement)
//		}

		var region = getRegion('region', registry, statement)
		var splitIDs = getStrings('splitID', statement)
		var stratas = getStratas(registry, statement)
		var pointIndexSet = getPointIndexSet(antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}
		bevelPoints(bevels, mesh, pointIndexSet, points)
		mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), points)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'bevel',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for bevel in alteration.', statement])
	}
}

var gExpand = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var expansionXY = getFloatsByDefault([1.0], 'expansionXY', registry, statement, this.name)

//deprecated
		var expansionZ = getFloatByDefault(0.0, 'expansionZ', registry, statement, this.name)

		var expansionBottom = getFloatByDefault(0.0, 'expansionBottom', registry, statement, this.name)
		var expansionTop = getFloatByDefault(expansionZ, 'expansionTop', registry, statement, this.name)
		expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'expand',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for expand in alteration.', statement])
	}
}

var gFillet = {
	getPoints: function(points, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var checkLength = getBooleanByDefault(true, 'checkLength', registry, statement, this.name)
		var numberOfSides = getFloatByDefault(this.sides, 'sides', registry, statement, this.name)
		var radius = getFloatByDefault(1.0, 'radius', registry, statement, this.name)
		var region = getRegion('region', registry, statement)

		if (antiregion == undefined && region == undefined) {
			return getFilletedPolygon(numberOfSides, points, radius, checkLength)
		}
		var pointIndexSet = new Set()

		if (region == undefined) {
			addRangeToSet(pointIndexSet, 0, points.length)
		}
		else {
			addPointsToIndexSet(pointIndexSet, points, region.polygons)
			if (region.pointStringSet.size > 0) {
				for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
					if (region.pointStringSet.has(points[pointIndex].slice(0,2).toString())) {
						pointIndexSet.add(pointIndex)
					}
				}
			}
			if (region.equations.length > 0) {
				var variableMap = getVariableMapByStatement(statement)
				for (var equation of region.equations) {
					for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
						variableMap.set('point', points[pointIndex].toString())
						if (getValueByEquation(registry, statement, equation)) {
							pointIndexSet.add(pointIndex)
						}
					}
				}
			}
		}
		removePointsFromIndexSetByAntiregion(antiregion, pointIndexSet, points)
		var pointIndexes = Array.from(pointIndexSet)
		pointIndexes.sort(compareNumberDescending)
		for (var pointIndex of pointIndexes) {
			addFilletedPointsByIndex(pointIndex, points, radius, numberOfSides, checkLength)
		}
		return points
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'fillet',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in fillet in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
	},
	sides: 12
}

var gMirror = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, this.name)
		if (centerDirection == null) {
			return
		}
		mirrorMesh(centerDirection, getChainMatrix3D(registry, statement), mesh)
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, this.name)
		if (centerDirection != null) {
			addRotationToCenterDirection(centerDirection)
			for (var point of points) {
				mirrorByCenterDirectionRotation(centerDirection, point)
			}
			points.reverse()
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'mirror',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in mirror in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No work mesh or points could be found for mirror in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gMirrorJoin = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, this.name)
		if (centerDirection == null) {
			return
		}
		var mirroredMesh = getMeshCopy(mesh)
		mirrorMesh(centerDirection, getChainMatrix3D(registry, statement), mirroredMesh)
		addMeshToJoinedMesh(mesh, mirroredMesh)
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, this.name)
		var mirrorStart = points.length - 1
		if (centerDirection == null) {
			centerDirection = getCenterDirectionMirrorStart(mirrorStart, points)
			mirrorStart = centerDirection.mirrorStart
		}
		addMirrorPoints(centerDirection, mirrorStart, points)
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'mirrorJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in mirrorJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No work mesh or points could be found for mirrorJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gMove = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
		var boundingBox = getMeshBoundingBox(mesh)
		var lowerLeft = getFloatsByStatement('lowerLeft', registry, statement)
		if (getIsEmpty(lowerLeft)) {
			var center = getFloatsByStatement('center', registry, statement)
			var dimensions2D = getSubtraction2D(boundingBox[1], boundingBox[0])
			if (getIsEmpty(center)) {
				var bedSize = getFloatsByStatement('bedSize', registry, statement)
				if (!getIsEmpty(bedSize)) {
					if (bedSize.length == 1) {
						bedSize.push(bedSize[0])
					}
					if (dimensions2D[0] > bedSize[0] || dimensions2D[1] > bedSize[1]) {
						warningByList(['The mesh is bigger than the bed.', statement, dimensions2D, bedSize])
					}
					center = getMultiplication2DScalar(bedSize, 0.5)
				}
			}
			if (!getIsEmpty(center)) {
				multiply2DScalar(dimensions2D, 0.5)
				lowerLeft = getSubtraction2D(center, dimensions2D)
			}
		}
		if (getIsEmpty(lowerLeft)) {
			lowerLeft = [0.0]
		}
		if (!getIsEmpty(lowerLeft)) {
			if (lowerLeft.length == 1) {
				lowerLeft.push(lowerLeft[0])
			}
			if (lowerLeft.length == 2) {
				lowerLeft.push(0.0)
			}
			add3Ds(mesh.points, getSubtraction3D(lowerLeft, boundingBox[0]))
			statement.attributeMap.set('lowerLeft', lowerLeft.toString())
		}
		statement.attributeMap.set('boundingBox', getMeshBoundingBox(mesh).toString())
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'move',
	processStatement: function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for move in alteration.', statement])
	}
}

var gMultiplyJoin = {
	alterMesh: function(mesh, registry, statement) {
		var vector = getVector3DByStatement(registry, statement)
		var increments = getFloatsByStatement('increment', registry, statement)
		if (getIsEmpty(increments)) {
			var dotProductRange = getDotProduct3DRange(mesh.points, vector)
			increments = [dotProductRange[1] - dotProductRange[0]]
		}
		var quantity = getIntByDefault(2, 'quantity', registry, statement, this.name)
		if (Math.abs(quantity) < 2) {
			return
		}
		if (quantity < 0) {
			reverseSigns(increments)
			quantity = -quantity
		}
		var meshCopy = getMeshCopy(mesh)
		var translation = [0.0, 0.0, 0.0]
		for (var additionIndex = 0; additionIndex < quantity - 1; additionIndex++) {
			var additionMesh = getMeshCopy(meshCopy)
			add3D(translation, getMultiplication3DScalar(vector, increments[additionIndex % increments.length]))
			add3Ds(additionMesh.points, translation)
			addMeshToJoinedMesh(mesh, additionMesh)
		}
	},
	getPoints: function(points, registry, statement) {
		if (getIsEmpty(points)) {
			noticeByList(['No points for multiplyJoin in alteration.', statement])
			return points
		}
		var vector = getVector2DByStatement(registry, statement)
		var increments = getFloatsByStatement('increment', registry, statement)
		if (getIsEmpty(increments)) {
			var dotProductRange = getDotProduct2DRange(points, vector)
			increments = [dotProductRange[1] - dotProductRange[0]]
		}
		var quantity = getIntByDefault(2, 'quantity', registry, statement, this.name)
		if (Math.abs(quantity) < 2) {
			return points
		}
		if (quantity < 0) {
			reverseSigns(increments)
			quantity = -quantity
		}
		var multipliedPoints = getArraysCopy(points)
		var translation = [0.0, 0.0, 0.0]
		for (var additionIndex = 0; additionIndex < quantity - 1; additionIndex++) {
			var additionPoints = getArraysCopy(multipliedPoints)
			add2D(translation, getMultiplication2DScalar(vector, increments[additionIndex % increments.length]))
			add2Ds(additionPoints, translation)
			if (distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
				additionPoints.splice(0, 1)
			}
			pushArray(points, additionPoints)
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'multiplyJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in multiplyJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No work mesh or points could be found for multiplyJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polyline', 'tag', registry, statement, this.name)
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gOutset = {
	getPoints: function(points, registry, statement) {
		var outsetPolygons = getOutsetPolygons(points, registry, statement, this.name)
		if (outsetPolygons.length == 0) {
			return []
		}
		return outsetPolygons[0]
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'outset',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in outset in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No points could be found for outset in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		var outsetPolygons = getOutsetPolygons(points, registry, statement, this.name)

		if (getIsEmpty(outsetPolygons)) {
			setPointsExcept([], registry, statement)
			return
		}

		if (outsetPolygons.length == 1) {
			setPointsExcept(outsetPolygons[0], registry, statement)
			return
		}
		convertToGroup(statement)
		addPolygonsToGroup(outsetPolygons, registry, statement)
	}
}

var gPolygonate = {
	alterMesh: function(mesh, registry, statement) {
		polygonateMesh(mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonate',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for polygonate in alteration.', statement])
	}
}

var gPolygonJoin = {
	alterMesh: function(mesh, registry, statement) {
		var betweenAlign = getFloatByDefault(0.0, 'betweenAlign', registry, statement, this.name)
		var path = getPath2DByStatement(registry, statement)
		console.log(path)
		if (path.length == 0) {
			return
		}
		var beginPoint = path[0]
		if (path.length == 1) {
			add2Ds(mesh.points, beginPoint)
			return
		}
		var endsBetween = getEndsBetween(mesh)
		var beginEnd = getSubtraction2D(path[1], beginPoint)
		var beginEndLength = length2D(beginEnd)
		divide2DScalar(beginEnd, beginEndLength)
		var meshCopy = getMeshCopy(mesh)
		var rightOffset = beginEndLength - endsBetween.rightX
		var betweenOffset = betweenAlign * rightOffset
		for (var pointIndex of endsBetween.betweens) {
			mesh.points[pointIndex][0] += betweenOffset
		}
		var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
		transform2DPointsByFacet(endsBetween.betweens, matrix2D, mesh.points)
		if (path.length == 2) {
			transform2DPointsByFacet(endsBetween.leftAll, matrix2D, mesh.points)
			transform2DPointsByFacet(endsBetween.rightAll, matrix2D, mesh.points)
			return
		}
		var beforePoint = path[path.length - 1]
		var beforeBegin = normalize2D(getSubtraction2D(beginPoint, beforePoint))
		var beforeEnd = normalize2D(getAddition2D(beforeBegin, beginEnd))
		var dotProduct = Math.max(dotProduct2D(beforeEnd, beforeBegin), 0.01)
		var leftMatrix2D = getMatrix2DByTranslate([-endsBetween.leftX])
		leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByScale([1.0, 1.0 / dotProduct]), leftMatrix2D)
		leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByRotationVectorTranslation(beforeEnd, beginPoint), leftMatrix2D)
		transform2DPointsByFacet(endsBetween.leftAll, leftMatrix2D, mesh.points)
		var pointIndexMap = new Map()
		for (var outerIndex = 1; outerIndex < path.length; outerIndex++) {
			beginPoint = path[outerIndex]
			beginEnd = getSubtraction2D(path[(outerIndex + 1) % path.length], beginPoint)
			beginEndLength = length2D(beginEnd)
			divide2DScalar(beginEnd, beginEndLength)
			var additionCopy = getMeshCopy(meshCopy)
			var betweenMatrix2D = getMatrix2DByTranslate([betweenAlign * (beginEndLength - endsBetween.rightX)])
			var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
			betweenMatrix2D = getMultiplied2DMatrix(matrix2D, betweenMatrix2D)
			transform2DPointsByFacet(endsBetween.betweens, betweenMatrix2D, additionCopy.points)
			var beforePoint = path[outerIndex - 1]
			var beforeBegin = normalize2D(getSubtraction2D(beginPoint, beforePoint))
			var beforeEnd = normalize2D(getAddition2D(beforeBegin, beginEnd))
			var dotProduct = Math.max(dotProduct2D(beforeEnd, beforeBegin), 0.01)
			var leftMatrix2D = getMatrix2DByTranslate([-endsBetween.leftX])
			leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByScale([1.0, 1.0 / dotProduct]), leftMatrix2D)
			leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByRotationVectorTranslation(beforeEnd, beginPoint), leftMatrix2D)
			transform2DPointsByFacet(endsBetween.leftAll, leftMatrix2D, additionCopy.points)
			nullifyFacets(additionCopy.facets, endsBetween.leftFacetStart, endsBetween.rightFacetStart)
			var rightMeshStart = endsBetween.rightFacetStart + mesh.facets.length - meshCopy.facets.length
			nullifyFacets(mesh.facets, rightMeshStart, mesh.facets.length)
			var meshLengthMinus = mesh.points.length - meshCopy.points.length
			for (var endVertexFacet of endsBetween.endVertexFacets) {
				var leftFacet = endVertexFacet.leftFacet
				var rightFacet = endVertexFacet.rightFacet
				for (var vertexIndex = 0; vertexIndex < leftFacet.length; vertexIndex++) {
					var otherVertexIndex = (endVertexFacet.closestOtherVertexIndex - vertexIndex + leftFacet.length) % leftFacet.length
					pointIndexMap.set(rightFacet[vertexIndex] + meshLengthMinus, leftFacet[otherVertexIndex] + mesh.points.length)
				}
			}
			addMeshToAssembledMesh(mesh, additionCopy)
		}
		var meshLengthMinus = mesh.points.length - meshCopy.points.length
		for (var endVertexFacet of endsBetween.endVertexFacets) {
			var leftFacet = endVertexFacet.leftFacet
			var rightFacet = endVertexFacet.rightFacet
			for (var vertexIndex = 0; vertexIndex < leftFacet.length; vertexIndex++) {
				var otherVertexIndex = (endVertexFacet.closestOtherVertexIndex - vertexIndex + leftFacet.length) % leftFacet.length
				pointIndexMap.set(rightFacet[vertexIndex] + meshLengthMinus, leftFacet[otherVertexIndex])
			}
		}
		nullifyFacets(mesh.facets, endsBetween.leftFacetStart, endsBetween.rightFacetStart)
		var rightMeshStart = endsBetween.rightFacetStart + mesh.facets.length - meshCopy.facets.length
		nullifyFacets(mesh.facets, rightMeshStart, mesh.facets.length)
		updateMeshByPointMap(mesh, pointIndexMap)
		removeUnfacetedPoints(mesh)
	},
	getPoints: function(points, registry, statement) {
		if (getIsEmpty(points)) {
			noticeByList(['No points for polygonJoin in alteration.', statement])
			return points
		}
		var path = getPath2DByStatement(registry, statement)
		var originalPoints = getArraysCopy(points)
		points.length = 0
		for (var vertexIndex = 0; vertexIndex < path.length; vertexIndex++) {
			var beginPoint = path[vertexIndex]
			var beginEnd = normalize2D(getSubtraction2D(path[(vertexIndex + 1) % path.length], beginPoint))
			var additionPoints = getRotations2DVector(originalPoints, beginEnd)
			add2Ds(additionPoints, beginPoint)
			if (points.length > 0) {
				if (distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
					additionPoints.splice(0, 1)
				}
			}
			pushArray(points, additionPoints)
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in polygonJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No work mesh or points could be found for polygonJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gPolylineJoin = {
	alterMesh: function(mesh, registry, statement) {
		var betweenAlign = getFloatByDefault(0.0, 'betweenAlign', registry, statement, this.name)
		var path = getPath2DByStatement(registry, statement)
		if (path.length == 0) {
			return
		}
		var beginPoint = path[0]
		if (path.length == 1) {
			add2Ds(mesh.points, beginPoint)
			return
		}
		var endsBetween = getEndsBetween(mesh)
		var beginEnd = getSubtraction2D(path[1], beginPoint)
		var beginEndLength = length2D(beginEnd)
		divide2DScalar(beginEnd, beginEndLength)
		var meshCopy = getMeshCopy(mesh)
		var rightOffset = beginEndLength - endsBetween.rightX
		var betweenOffset = betweenAlign * rightOffset
		for (var pointIndex of endsBetween.betweens) {
			mesh.points[pointIndex][0] += betweenOffset
		}
		var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
		transform2DPointsByFacet(endsBetween.betweens, matrix2D, mesh.points)
		transform2DPointsByFacet(endsBetween.leftAll, matrix2D, mesh.points)
		console.log(endsBetween)
		var pointIndexMap = new Map()
		for (var outerIndex = 1; outerIndex < path.length - 1; outerIndex++) {
			beginPoint = path[outerIndex]
			beginEnd = getSubtraction2D(path[outerIndex + 1], beginPoint)
			beginEndLength = length2D(beginEnd)
			divide2DScalar(beginEnd, beginEndLength)
			var additionCopy = getMeshCopy(meshCopy)
			var betweenMatrix2D = getMatrix2DByTranslate([betweenAlign * (beginEndLength - endsBetween.rightX)])
			var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
			betweenMatrix2D = getMultiplied2DMatrix(matrix2D, betweenMatrix2D)
			transform2DPointsByFacet(endsBetween.betweens, betweenMatrix2D, additionCopy.points)
			var beforePoint = path[outerIndex - 1]
			var beforeBegin = normalize2D(getSubtraction2D(beginPoint, beforePoint))
			var beforeEnd = normalize2D(getAddition2D(beforeBegin, beginEnd))
			var dotProduct = Math.max(dotProduct2D(beforeEnd, beforeBegin), 0.01)
			var leftMatrix2D = getMatrix2DByTranslate([-endsBetween.leftX])
			leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByScale([1.0, 1.0 / dotProduct]), leftMatrix2D)
			leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByRotationVectorTranslation(beforeEnd, beginPoint), leftMatrix2D)
			transform2DPointsByFacet(endsBetween.leftAll, leftMatrix2D, additionCopy.points)
			for (var facetIndex = endsBetween.leftFacetStart; facetIndex < endsBetween.rightFacetStart; facetIndex++) {
				additionCopy.facets[facetIndex] = []
			}
			var rightMeshStart = endsBetween.rightFacetStart + mesh.facets.length - meshCopy.facets.length
			for (var facetIndex = rightMeshStart; facetIndex < mesh.facets.length; facetIndex++) {
				mesh.facets[facetIndex] = []
			}
			var meshLengthMinus = mesh.points.length - meshCopy.points.length
			for (var endVertexFacet of endsBetween.endVertexFacets) {
				var leftFacet = endVertexFacet.leftFacet
				var rightFacet = endVertexFacet.rightFacet
				for (var vertexIndex = 0; vertexIndex < leftFacet.length; vertexIndex++) {
					var otherVertexIndex = (endVertexFacet.closestOtherVertexIndex - vertexIndex + leftFacet.length) % leftFacet.length
					pointIndexMap.set(rightFacet[vertexIndex] + meshLengthMinus, leftFacet[otherVertexIndex] + mesh.points.length)
				}
			}
			addMeshToAssembledMesh(mesh, additionCopy)
		}
		matrix2D = getMultiplied2DMatrix(matrix2D, getMatrix2DByTranslate([rightOffset]))
		transform2DPointsByFacet(addArrayScalar(endsBetween.rightAll, mesh.points.length - meshCopy.points.length), matrix2D, mesh.points)
		updateMeshByPointMap(mesh, pointIndexMap)
		removeUnfacetedPoints(mesh)
	},
	getPoints: function(points, registry, statement) {
		if (getIsEmpty(points)) {
			noticeByList(['No points for polylineJoin in alteration.', statement])
			return points
		}
		var path = getPath2DByStatement(registry, statement)
		var originalPoints = getArraysCopy(points)
		points.length = 0
		for (var vertexIndex = 0; vertexIndex < path.length - 1; vertexIndex++) {
			var beginPoint = path[vertexIndex]
			var beginEnd = normalize2D(getSubtraction2D(path[vertexIndex + 1], beginPoint))
			var additionPoints = getRotations2DVector(originalPoints, beginEnd)
			add2Ds(additionPoints, beginPoint)
			if (points.length > 0) {
				if (distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
					additionPoints.splice(0, 1)
				}
			}
			pushArray(points, additionPoints)
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polylineJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in polylineJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No work mesh or points could be found for polylineJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polyline', 'tag', registry, statement, this.name)
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gReverse = {
	getPoints: function(points, registry, statement) {
		return getArraysCopy(points).reverse()
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'reverse',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == null) {
					noticeByList(['No points could be found for the workStatement in reverse in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)

		if (points == null) {
			noticeByList(['No points could be found for reverse in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gSplit = {
	alterMesh: function(mesh, registry, statement) {
		var boundaryEquations = getEquations('boundaryEquation', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var splitHeights = getFloatsByStatement('splitHeight', registry, statement)

		//deprecated24
		if (getIsEmpty(splitHeights)) {
			splitHeights = getPointsByKey('splitHeights', registry, statement)
		}

		var stratas = getStratas(registry, statement)
		splitMesh(boundaryEquations, statement.attributeMap.get('id'), matrix3D, mesh, polygons, registry, splitHeights, statement, stratas)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'split',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for split in alteration.', statement])
			return
		}
		var splitHeights = getFloatsByStatement('splitHeight', registry, statement)

		//deprecated24
		if (getIsEmpty(splitHeights)) {
			splitHeights = getPointsByKey('splitHeights', registry, statement)
		}

		var splitPolygons = []
		addSplitPolygonsByHeights(polygons, splitHeights, splitPolygons)
		addPolygonsToGroup(splitPolygons, registry, statement)
	}
}

var gTaper = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var maximumSpan = getFloatByDefault(1.0, 'maximumSpan', registry, statement, this.name)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name)
		var sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name)
		taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'taper',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for taper in alteration.', statement])
	}
}

var gThread = {
	alterMesh: function(mesh, registry, statement) {
		var axials = getPointsByKey('axial', registry, statement)
		var center = getFloatsByDefault([0.0, 0.0], 'center', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var isOutside = getBooleanByDefault(true, 'outside', registry, statement, this.name)
		var points = get3DsBy3DMatrix(matrix3D, mesh.points)
		var pointIndexSet = getPointIndexSetByOutside(center, isOutside, points, mesh)
		if (pointIndexSet.size == 0) {
			return
		}
		var heights = getHeights(registry, statement, this.name)
		var numberOfThreads = getIntByDefault(1, 'threads', registry, statement, this.name)
		var taperAngle = getFloatByDefault(30.0, 'taperAngle', registry, statement, this.name)
		var translations = getPointsByKey('translations', registry, statement)
		threadPoints(axials, center, heights, numberOfThreads, getBoundedPointsBySet(pointIndexSet, points), taperAngle, translations)
		mesh.points = get3DsBy3DMatrix(getInverseRotationTranslation3D(matrix3D), points)
		removeClosePoints(mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'thread',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No work mesh could be found for thread in alteration.', statement])
	}
}

var gTriangulate = {
	alterMesh: function(mesh, registry, statement) {
		mesh.facets = getAllTriangleFacets(mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangulate',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for triangulate in alteration.', statement])
			return
		}
		var triangulatedPolygons = get3DTriangulatedPolygons(polygons)
		if (getIsEmpty(triangulatedPolygons)) {
			noticeByList(['No triangulatedPolygons could be found for triangulate in alteration.', statement])
		}
		else{
			convertToGroup(statement)
			addPolygonsToGroup(triangulatedPolygons, registry, statement)
		}
	}
}

var gWedge = {
	alterMesh: function(mesh, registry, statement) {
		var inset = getPointByDefault([1.0, 1.0], 'inset', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		wedgeMesh(inset, matrix3D, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'wedge',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for wedge in alteration.', statement])
			return
		}
		var heights = getHeights(registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var pillarMesh = getPillarMesh(heights, matrix3D, polygons)
		this.alterMesh(pillarMesh, registry, statement)
		analyzeOutputMesh(pillarMesh, registry, statement)
	}
}

var gAlterationProcessors = [
gBend, gBevel, gExpand, gFillet, gMirror, gMirrorJoin, gMove, gMultiplyJoin,
gOutset, gPolygonate, gPolygonJoin, gPolylineJoin, gReverse, gSplit, gTaper, gThread, gTriangulate, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
