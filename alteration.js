//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addAllToPointIndexSet(pointIndexSet, points, stratas) {
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		if (getIsInStratas(stratas, points[pointIndex][2])) {
			pointIndexSet.add(pointIndex)
		}
	}
}

function addConnectedSegmentsToPolygons(meetingMap, polygon, polygons, toolSegments, workSegments) {
	var connectedSegmentArrays = getPolynodes(toolSegments, workSegments)
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

function addMirrorPoints(centerVector, mirrorStart, points) {
	var mirrorPoints = getMirrorPoints(centerVector, mirrorStart, points)
	trimBeginEnd(points, mirrorPoints)
	trimBeginEnd(mirrorPoints, points)
	pushArray(points, mirrorPoints)
}

function addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement, stratas) {
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
		var meeting = undefined
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
		if (meeting != undefined) {
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
//		var alterations = statement.attributeMap.get('alteration').replaceAll(',', ' ').split(' ').filter(lengthCheck)

//deprecated24
	if (statement.attributeMap.has('alteration') || statement.attributeMap.has('alterations')) {
		var alterations = undefined
		if (statement.attributeMap.has('alteration')) {
			alterations = statement.attributeMap.get('alteration').replaceAll(',', ' ').split(' ').filter(lengthCheck)
		}
		else {
			alterations = statement.attributeMap.get('alterations').replaceAll(',', ' ').split(' ').filter(lengthCheck)
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

function bevelPointIndex(bevelMap, bevels, horizontalDirectionMap, pointIndex, points) {
	var point = points[pointIndex]
	if (point == undefined) {
		noticeByList(['point is undefined in bevelPointIndex in alteration.', points, pointIndex])
		return
	}

	var interpolationAlong = getFlatInterpolationAlongBeginEnd(point[2], bevels)
	var along = interpolationAlong[0]
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var oneMinus = 1.0 - along
	var inset = [oneMinus * lower[0] + along * upper[0], oneMinus * lower[1] + along * upper[1]]
	var normals = horizontalDirectionMap.get(pointIndex)
	if (normals == undefined) {
		noticeByList(['Unfaceted point in bevelPointIndex in alteration.', point, pointIndex, points])
		return
	}

	var horizontalNormalIndex = undefined
	var smallestZ = Number.MAX_VALUE
	for (var normalIndex = 0; normalIndex < normals.length; normalIndex++) {
		var z = Math.abs(normals[normalIndex][2])
		if (z < smallestZ) {
			smallestZ = z
			horizontalNormalIndex = normalIndex
		}
	}

	var horizontalNormal = normals[horizontalNormalIndex]
	var highestCrossProductZ = -Number.MAX_VALUE
	var highestCrossNormal = horizontalNormal
	var maximumZ = smallestZ + 0.5
	var highestNormalZ = 0.0
	for (var normalIndex = 0; normalIndex < normals.length; normalIndex++) {
		var otherNormal = normals[normalIndex]
		highestNormalZ = Math.max(highestNormalZ, Math.abs(otherNormal[2]))
		if (normalIndex != horizontalNormalIndex) {
			var crossProductZ = Math.abs(crossProduct2D(horizontalNormal, otherNormal))
			crossProductZ += gClose * Math.abs(dotProduct2D(horizontalNormal, otherNormal))
			if (crossProductZ > highestCrossProductZ && Math.abs(otherNormal[2]) < maximumZ) {
				highestCrossProductZ = crossProductZ
				highestCrossNormal = otherNormal
			}
		}
	}

	var addition = getAddition2D(normalize2D(horizontalNormal.slice(0, 2)), normalize2D(highestCrossNormal.slice(0, 2)))
	var multiplier = -2.0 * highestNormalZ / lengthSquared2D(addition)
	bevelMap.set(pointIndex, getMultiplication2D(multiply2DScalar(addition, multiplier), inset))
}

function bevelPoints(bevels, mesh, pointIndexSet, points) {
	var facets = mesh.facets
	if (getIsEmpty(bevels)) {
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
		var facet = facets[facetIndex]
		var normal = getNormalByFacet(facet, points)
		if (normal != undefined) {
			for (var pointIndex of facet) {
				if (pointIndexSet.has(pointIndex)) {
					normal.push(facetIndex)
					for (var pointIndex of facet) {
						addElementToMapArray(horizontalDirectionMap, pointIndex, normal)
					}
					break
				}
			}
		}
	}

	var bevelMap = new Map()
	for (var pointIndex of pointIndexSet) {
		bevelPointIndex(bevelMap, bevels, horizontalDirectionMap, pointIndex, points)
	}

	for (var pointIndex of bevelMap.keys()) {
		add2D(points[pointIndex], bevelMap.get(pointIndex))
	}
}

function expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh) {
	if (mesh == undefined) {
		return
	}
	if (expansionXY.length == 1) {
		expansionXY.push(expansionXY[0])
	}
	var facets = mesh.facets
	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
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
	mesh.points = get3DsByMatrix3D(mesh.points, getInverseRotationTranslation3D(matrix3D))
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

function getCenterVector(registry, statement, tag) {
	if (getBooleanByDefault('segment', registry, statement, tag, false)) {
		return {isSegment:true}
	}

	return getCenterVectorOnly(registry, statement, tag)
}

function getCenterVectorMirrorStart(mirrorStart, points) {
	if (points.length < 2) {
		return {center:center, vector:[1.0, 0.0], mirrorStart:mirrorStart}
	}

	var penultimatePoint = points[points.length - 2]
	var ultimatePoint = points[points.length - 1]
	var vector = getSubtraction2D(ultimatePoint, penultimatePoint)
	vector = [vector[1], -vector[0]]
	perpendicular = multiply2DScalar(getAddition2D(penultimatePoint, ultimatePoint), 0.5)
	var vectorLength = length2D(vector)
	if (vectorLength == 0.0) {
		vector = [1.0, 0.0]
	}
	else {
		divide2DScalar(vector, vectorLength)
	}

	return {center:perpendicular.slice(0), mirrorStart:mirrorStart - 2, vector:vector}
}

function getCenterVectorOnly(registry, statement, tag) {
	var centerVector = {center:getPoint2DByDefault('center', registry, statement, tag, [0.0, 0.0])}
	centerVector.vector = polarCounterclockwise(getFloatByDefault('direction', registry, statement, tag, 90.0) * gRadiansPerDegree)
	return centerVector
}

function getDirectionMapZ(facets, points) {
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != undefined) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				addElementToMapArray(horizontalDirectionMap, pointIndex, normal)
			}
		}
	}
	var minimumZ = Number.MAX_VALUE
	var maximumZ = -Number.MAX_VALUE
	for (var key of horizontalDirectionMap.keys()) {
		var z = points[key][2]
		minimumZ = Math.min(minimumZ, z)
		maximumZ = Math.max(maximumZ, z)
		var normals = horizontalDirectionMap.get(key)
		normals.sort(compareAbsoluteElementTwoAscending)
		var addition = getAddition2D(normalize2D(normals[0]), normalize2D(normals[1]))
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

function getFilletedCornerByMap(points, radius, pointIndex, tangentSidesMap) {
	var centerPoint = points[pointIndex]
	if (!tangentSidesMap.has(pointIndex)) {
		return [centerPoint]
	}

	var tangentSides = tangentSidesMap.get(pointIndex)
	var tangentLength = tangentSides.tangentLength
	var beginIndex = (pointIndex - 1 + points.length) % points.length
	var endPoint = points[beginIndex]
	var beginPoint = points[(pointIndex - 1 + points.length) % points.length]
	var endIndex = (pointIndex + 1) % points.length
	var endPoint = points[endIndex]
	var centerBeginDistance = distance2D(centerPoint, beginPoint)
	var beginTangentLength = 0.0
	var radiusMultiplier = 1.0
	if (tangentSidesMap.has(beginIndex)) {
		beginTangentLength = tangentSidesMap.get(beginIndex).tangentLength
	}

	var totalBeginLength = beginTangentLength + tangentLength
	if (totalBeginLength * gOneMinusClose > centerBeginDistance) {
		radiusMultiplier = centerBeginDistance / totalBeginLength
	}

	var centerEndDistance = distance2D(centerPoint, endPoint)
	var endTangentLength = 0.0
	if (tangentSidesMap.has(endIndex)) {
		endTangentLength = tangentSidesMap.get(endIndex).tangentLength
	}

	var totalEndLength = endTangentLength + tangentLength
	if (totalEndLength * gOneMinusClose > centerEndDistance) {
		radiusMultiplier = Math.min(radiusMultiplier, centerEndDistance / totalEndLength)
	}

	numberOfFilletSides = Math.ceil(Math.pow(radiusMultiplier, 0.25) * tangentSides.numberOfFilletSides - gClose)
	if (numberOfFilletSides < 2) {
		return [centerPoint]
	}

	radius *= radiusMultiplier
	tangentLength *= radiusMultiplier
	var absoluteHalfCornerAngle = tangentSides.absoluteHalfCornerAngle
	var centerBegin = tangentSides.centerBegin
	var centerVector = tangentSides.centerVector
	var halfSideLength = Math.tan(absoluteHalfCornerAngle / numberOfFilletSides) * radius
	var beginTangent = getAddition2D(centerPoint, getMultiplication2DScalar(centerBegin, tangentLength - halfSideLength))
	var filletCenter = getAddition2D(centerPoint, getMultiplication2DScalar(centerVector, radius / tangentSides.perpendicular))
	var filletAngle = 2.0 * absoluteHalfCornerAngle / numberOfFilletSides
	if (dotProduct2D([centerBegin[1], -centerBegin[0]], tangentSides.centerEnd) < 0.0) {
		filletAngle = -filletAngle
	}
	var filletedCorner = [beginTangent]
	var beginTangentCenter = getSubtraction2D(beginTangent, filletCenter)
	var filletRotation = polarCounterclockwise(filletAngle)
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		beginTangentCenter = getRotation2DVector(beginTangentCenter, filletRotation)
		filletedCorner.push(getAddition2D(filletCenter, beginTangentCenter))
	}

	return filletedCorner
}

function getFilletedPolygonByIndexes(points, radius, numberOfSides, pointIndexes) {
	var minimumAngle = gPI2 / numberOfSides
	if (pointIndexes == undefined) {
		pointIndexes = getSequence(points.length)
	}
	var tangentSidesMap = new Map()
	for (var pointIndex of pointIndexes) {
		var beginPoint = points[(pointIndex - 1 + points.length) % points.length]
		var centerPoint = points[pointIndex]
		var endPoint = points[(pointIndex + 1) % points.length]
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		if (centerBeginLength > 0.0 && centerEndLength > 0.0) {
			divide2DScalar(centerBegin, centerBeginLength)
			divide2DScalar(centerEnd, centerEndLength)
			var twoOverAngle = 2.0 / minimumAngle
			var absoluteHalfCornerAngle = Math.acos(0.5 * distance2D(centerBegin, centerEnd))
			var cornerOverMinimum = twoOverAngle * absoluteHalfCornerAngle
			var numberOfFilletSides = Math.ceil(cornerOverMinimum - gClose)
			if (numberOfFilletSides > 1) {
				var centerVector = normalize2D(getAddition2D(centerBegin, centerEnd))
				var dotProduct = dotProduct2D(centerVector, centerBegin)
				var perpendicular = Math.sqrt(1.0 - dotProduct * dotProduct)
				var tangentLength = radius * dotProduct / perpendicular
				var tangentSides = {absoluteHalfCornerAngle:absoluteHalfCornerAngle, centerBegin:centerBegin, centerEnd:centerEnd}
				tangentSides.centerVector = centerVector
				tangentSides.numberOfFilletSides = numberOfFilletSides
				tangentSides.perpendicular = perpendicular
				tangentSides.tangentLength = tangentLength
				tangentSidesMap.set(pointIndex, tangentSides)
			}
		}
	}

	var filletedPolygon = []
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		pushArray(filletedPolygon, getFilletedCornerByMap(points, radius, pointIndex, tangentSidesMap))
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
	return undefined
}

function getMirrorPoints(centerVector, mirrorStart, points) {
	var mirrorPoints = getArraysCopy(points.slice(0, mirrorStart))
	mirrorPoints.reverse()
	mirrorPointsByCenterVector(centerVector, mirrorPoints)
	return mirrorPoints
}

function getOutsetPolygons(points, registry, statement, tag) {
	var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
	var checkIntersection = getBooleanByDefault('checkIntersection', registry, statement, tag, true)
	var clockwise = getBooleanByStatement('clockwise', registry, statement)
	if (clockwise == undefined) {
		clockwise = getIsClockwise(points)
	}

	var markerAbsolute = getBooleanByDefault('markerAbsolute', registry, statement, tag, true)
	var outsets = getOutsets(registry, statement, tag)
	var marker = getMarker('marker', outsets, registry, statement)
	var baseMarker = getMarker('baseMarker', outsets, registry, statement)
	var tipMarker = getMarker('tipMarker', outsets, registry, statement)
	if (baseMarker == undefined) {
		baseMarker = marker
	}

	if (tipMarker == undefined) {
		tipMarker = marker
	}

	return getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, points, tipMarker)
}

function getOutsets(registry, statement, tag) {
	var outsets = getPointsByKey('outsets', registry, statement)
	if (getIsEmpty(outsets)) {
		outsets = [getPoint2DByDefault('outset', registry, statement, tag, [1.0, 1.0])]
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

function getPointIndexSet(antiregion, points, region, registry, statement, stratas) {
	var pointIndexSet = new Set()
	if (region == undefined) {
		addAllToPointIndexSet(pointIndexSet, points, stratas)
	}
	else {
		addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement, stratas)
	}

	return removePointsFromIndexSetByAntiregion(antiregion, pointIndexSet, points)
}

function getPointIndexSetByIDs(antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas) {
	var addAll = true
	var pointIndexSet = new Set()
	if (mesh.intersectionIndexesMap != undefined) {
		for (var id of intersectionIDs) {
			addAll = false
			if (mesh.intersectionIndexesMap.has(id)) {
				addElementsToSet(pointIndexSet, mesh.intersectionIndexesMap.get(id))
			}
		}
	}

	if (mesh.splitIndexesMap != undefined) {
		for (var id of splitIDs) {
			addAll = false
			if (mesh.splitIndexesMap.has(id)) {
				addElementsToSet(pointIndexSet, mesh.splitIndexesMap.get(id))
			}
		}
	}

	if (region != undefined) {
		addAll = false
		addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement, stratas)
	}

	if (addAll) {
		addAllToPointIndexSet(pointIndexSet, points, stratas)
	}

	return removePointsFromIndexSetByAntiregion(antiregion, pointIndexSet, points)
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
		var alterations = undefined
		if (statement.attributeMap.has('alteration')) {
			alterations = statement.attributeMap.get('alteration').replaceAll(',', ' ').split(' ').filter(lengthCheck)
		}
		else {
			alterations = statement.attributeMap.get('alterations').replaceAll(',', ' ').split(' ').filter(lengthCheck)
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
		if (polygonSegment != undefined) {
			var midpointZ = 0.5 * (polygonSegment[0].point[parameterIndex] + polygonSegment[1].point[parameterIndex])
			if (midpointZ > splitHeight) {
				topSegments[vertexIndex] = polygonSegments[vertexIndex]
				polygonSegments[vertexIndex] = undefined
			}
		}
	}
	return topSegments
}

function mirrorMesh(centerVector, matrix3D, mesh) {
	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
	mirrorPointsByCenterVector(centerVector, mesh.points)
	mesh.points = get3DsByMatrix3D(mesh.points, getInverseRotationTranslation3D(matrix3D))
	for (var facet of mesh.facets) {
		facet.reverse()
	}
}

function mirrorPointsByCenterVector(centerVector, points) {
	var reverseRotation = [centerVector.vector[0], -centerVector.vector[1]]
	var mirrorFromY = 0.0
	if (centerVector.center != undefined) {
		mirrorFromY = (centerVector.center[0] * reverseRotation[1] + centerVector.center[1] * reverseRotation[0]) * 2.0
	}

	for (var point of points) {
		rotate2DVector(point, reverseRotation)
		point[1] = mirrorFromY - point[1]
		rotate2DVector(point, centerVector.vector)
	}
}

var gPlacer = {
	getPoints: function(points, registry, statement) {
		var placerPoints = getArraysCopy(points)
		if (statement.attributeMap.has('placerPoints')) {
			placerPoints = getPointsByValue(registry, statement, statement.attributeMap.get('placerPoints'))
		}

		if (placerPoints.length < 2) {
			noticeByList(['placerPoints.length < 2 in placer in alteration.', points, placerPoints, statement])
			return points
		}

		var begin = placerPoints[0]
		var end = placerPoints[placerPoints.length - 1]
		var beginEnd = getSubtraction2D(end, begin)
		var beginEndLength = length2D(beginEnd)
		if (beginEndLength == 0.0) {
			noticeByList(['beginEndLength == 0.0 in placer in alteration.', points, placerPoints, statement])
			return points
		}

		var center = multiply2DScalar(getAddition2D(begin, end), 0.5)
		var direction = getFloatByDefault('direction', registry, statement, this.tag, 90.0)
		var distance = getFloatByDefault('distance', registry, statement, this.tag, 10.0)
		multiply2DScalar(beginEnd, distance / beginEndLength)
		add2D(center, rotate2DVector(beginEnd, polarCounterclockwise(direction * gRadiansPerDegree)))
		var variableMap = getVariableMapByStatement(statement.parent)
		variableMap.set('placerX', center[0].toString())
		variableMap.set('placerY', center[1].toString())
		return points
	},
	tag: 'placer',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in outset in alteration.', workStatement, statement])
				}
				else {
					this.getPoints(points, registry, statement)
				}
			}
		}
		else {
			noticeByList(['No workStatements could be found for placer in alteration.', statement])
		}
	}
}

function setPointsExcept(points, registry, statement) {
	setPointsHD(getPointsExcept(points, registry, statement), statement)
}

function splitMesh(antiregion, id, matrix3D, mesh, region, registry, splitHeights, statement, stratas) {
	if (mesh == undefined || getIsEmpty(splitHeights)) {
		return
	}

	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
	var facets = mesh.facets
	var points = mesh.points
	for (var splitHeight of splitHeights) {
		var pointIndexSet = getPointIndexSet(antiregion, points, region, registry, statement, stratas)
		var facetIndexSet = new Set()
		for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
			var facet = facets[facetIndex]
			var shouldAdd = true
			for (var pointIndex of facet) {
				if (!pointIndexSet.has(pointIndex)) {
					shouldAdd = false
					break
				}
			}
			if (shouldAdd) {
				facetIndexSet.add(facetIndex)
			}
		}
		var heightFacetIndexSet = new Set()
		for (var facetIndex of facetIndexSet) {
			if (getPolygonCrossesSplitHeight(splitHeight, getPolygonByFacet(facets[facetIndex], points))) {
				heightFacetIndexSet.add(facetIndex)
			}
		}
		addSplitIndexesByFacetSet(heightFacetIndexSet, id, splitHeight, mesh)
	}

	mesh.points = get3DsByMatrix3D(mesh.points, getInverseRotationTranslation3D(matrix3D))
}

function taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle) {
	if (mesh == undefined) {
		return
	}
	var facets = mesh.facets
	if (facets.length == 0) {
		return
	}
	overhangAngle *= gRadiansPerDegree
	sagAngle *= gRadiansPerDegree
	var originalPoints = mesh.points
	var inversePoints = get3DsByMatrix3D(originalPoints, matrix3D)
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
	pushArray(originalPoints, get3DsByMatrix3D(inversePoints.slice(originalPoints.length), getInverseRotationTranslation3D(matrix3D)))
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
		angle += gPI2
	}
	var cycle = numberOfThreads * angle / gPI2
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
				if (value != undefined) {
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
				if (value != undefined) {
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

function trimBeginEnd(beginPoints, endPoints) {
	var endPoint = endPoints[endPoints.length - 1]
	if (distanceSquaredArray(beginPoints[0], endPoint) > gCloseSquared) {
		return
	}

	if (endPoints.length > 1 && beginPoints.length > 1) {
		var midpoint = multiplyArrayScalar(getAdditionArray(beginPoints[1], endPoints[endPoints.length - 2]), 0.5)
		if (distanceSquaredArray(midpoint, endPoint) < gCloseSquared) {
			beginPoints.splice(0, 1)
		}
	}

	endPoints.pop()
}

function wedgeMesh(inset, matrix3D, mesh) {
	if (mesh == undefined) {
		return
	}
	if (inset.length == 1) {
		inset = [inset[0], inset[0]]
	}
	var facets = mesh.facets
	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	var oneOverDeltaZ = 1.0 / directionMapZ.deltaZ
	for (var key of horizontalDirectionMap.keys()) {
		var centerPoint = mesh.points[key]
		var insetAtZ = getMultiplication2DScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = add2D(centerPoint.slice(0), getMultiplication2D(horizontalDirectionMap.get(key), insetAtZ))
	}
	mesh.points = get3DsByMatrix3D(mesh.points, getInverseRotationTranslation3D(matrix3D))
}

var gBend = {
	alterMesh: function(mesh, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var intersectionIDs = getStrings('intersectionID', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsByMatrix3D(mesh.points, matrix3D)
		var region = getRegion('region', registry, statement)
		var splitIDs = getStrings('splitID', statement)
		var stratas = getStratas(registry, statement)
		var pointIndexSet = getPointIndexSetByIDs(
		antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}

		var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
		var translations = getFloatListsByStatement('translation', registry, statement)
		var center = getFloatsByDefault('center', registry, statement, statement.tag, [0.0, 0.0, 0.0])
		var translationEquations = getEquations('translationEquation', statement)
		var vector = getVector3DByStatement(registry, statement)
		transformPoints3DByEquation(center, boundedPoints, registry, statement, translationEquations, translations, vector)
		mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
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
		var center = getFloatsByDefault('center', registry, statement, statement.tag, [0.0, 0.0])
		var translationEquations = getEquations('translationEquation', statement)
		var vector = getPoint3DByStatement('vector', registry, statement)
		transformPoints2DByEquation(center, boundedPoints, registry, statement, translationEquations, translations, vector)
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.tag, this)
		gCopyIDKeySet.add('region')
		gGetPointsMap.set(this.tag, this)
		gTagCenterMap.set(this.tag, this)
	},
	tag: 'bend',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in bend in alteration.', workStatement, statement])
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
		var points = get3DsByMatrix3D(mesh.points, matrix3D)

		//deprecated24
//		var polygons = getPolygonsHDRecursively(registry, statement)

//		var splitBevels = getPointsByKey('splitBevel', registry, statement)
//		if (getIsEmpty(splitBevels)) {
//			splitBevels = getPointsByKey('splitBevels', registry, statement)
//		}

		var region = getRegion('region', registry, statement)
		var splitIDs = getStrings('splitID', statement)
		var stratas = getStratas(registry, statement)
		var pointIndexSet = getPointIndexSetByIDs(
		antiregion, intersectionIDs, points, mesh, region, registry, splitIDs, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}

		bevelPoints(bevels, mesh, pointIndexSet, points)
		mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
	},
	tag: 'bevel',
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
		var expansionXY = getFloatsByDefault('expansionXY', registry, statement, this.tag, [1.0])
		var expansionBottom = getFloatByDefault('expansionBottom', registry, statement, this.tag, 0.0)
		var expansionTop = getFloatByDefault('expansionTop', registry, statement, this.tag, 0.0)
		expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh)
	},
	tag: 'expand',
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
		var separatedPolygons = getSeparatedPolygons(points)
		if (separatedPolygons.length < 2) {
			return this.getSeparatedFilletedPolygon(points, registry, statement)
		}

		for (var polygonIndex = 0; polygonIndex < separatedPolygons.length; polygonIndex++) {
			separatedPolygons[polygonIndex] = this.getSeparatedFilletedPolygon(separatedPolygons[polygonIndex], registry, statement)
		}

		return getConnectedPolygon(separatedPolygons)
	},
	getSeparatedFilletedPolygon: function(points, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var numberOfSides = getIntByDefault('sides', registry, statement, this.tag, this.sides)

//deprecated25
		var radius = getFloatByDefault('radius', registry, statement, this.tag, 1.0)
		radius = getFloatByDefault('r', registry, statement, this.tag, radius)

		var region = getRegion('region', registry, statement)
		if (antiregion == undefined && region == undefined) {
			return getFilletedPolygonByIndexes(points, radius, numberOfSides)
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
		pointIndexes.sort(compareNumberAscending)
		return getFilletedPolygonByIndexes(points, radius, numberOfSides, pointIndexes)
	},
	tag: 'fillet',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in fillet in alteration.', workStatement, statement])
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
		mirrorMesh(getCenterVectorOnly(registry, statement, this.tag), getChainMatrix3D(registry, statement), mesh)
	},
	getDefinitions: function() {
		return [viewBroker.center, viewBroker.direction, viewBroker.segment]
	},
	getPoints: function(points, registry, statement) {
		var centerVector = getCenterVector(registry, statement, this.tag)
		if (centerVector.isSegment != true) {
			mirrorPointsByCenterVector(centerVector, points)
			points.reverse()
		}

		return points
	},
	tag: 'mirror',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in mirror in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			noticeByList(['No work mesh or points could be found for mirror in alteration.', statement])
			return
		}

		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polygon')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gMirrorJoin = {
	alterMesh: function(mesh, registry, statement) {
		var mirroredMesh = getMeshCopy(mesh)
		mirrorMesh(getCenterVectorOnly(registry, statement, this.tag), getChainMatrix3D(registry, statement), mirroredMesh)
		addMeshToJoinedMesh(mesh, mirroredMesh)
	},
	getDefinitions: function() {
		return [viewBroker.center, viewBroker.direction, viewBroker.segment]
	},
	getPoints: function(points, registry, statement) {
		var centerVector = getCenterVector(registry, statement, this.tag)
		var mirrorStart = points.length
		if (centerVector.isSegment == true) {
			centerVector = getCenterVectorMirrorStart(mirrorStart, points)
			mirrorStart = centerVector.mirrorStart
		}

		addMirrorPoints(centerVector, mirrorStart, points)
		return points
	},
	tag: 'mirrorJoin',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in mirrorJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			noticeByList(['No work mesh or points could be found for mirrorJoin in alteration.', statement])
			return
		}

		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polygon')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gMove = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
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
	tag: 'move',
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
		var quantity = getIntByDefault('quantity', registry, statement, this.tag, 2)
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
		var quantity = getIntByDefault('quantity', registry, statement, this.tag, 2)
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
	tag: 'multiplyJoin',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in multiplyJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == undefined) {
			noticeByList(['No work mesh or points could be found for multiplyJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polyline')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gOutset = {
	getPoints: function(points, registry, statement) {
		return getLargestPolygon(getOutsetPolygons(points, registry, statement, this.tag))
	},
	tag: 'outset',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in outset in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			noticeByList(['No points could be found for outset in alteration.', statement])
			return
		}

		statement.tag = 'polygon'
		var outsetPolygons = getOutsetPolygons(points, registry, statement, this.tag)
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
	tag: 'polygonate',
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
		var betweenAlign = getFloatByDefault('betweenAlign', registry, statement, this.tag, 0.0)
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
			var additionPoints = getRotation2DsVector(originalPoints, beginEnd)
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
	tag: 'polygonJoin',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in polygonJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == undefined) {
			noticeByList(['No work mesh or points could be found for polygonJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polygon')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gPolylineJoin = {
	alterMesh: function(mesh, registry, statement) {
		var betweenAlign = getFloatByDefault('betweenAlign', registry, statement, this.tag, 0.0)
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
			var additionPoints = getRotation2DsVector(originalPoints, beginEnd)
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
	tag: 'polylineJoin',
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
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in polylineJoin in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
		var points = getPointsHD(registry, statement)

		if (points == undefined) {
			noticeByList(['No work mesh or points could be found for polylineJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polyline')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gReverse = {
	getPoints: function(points, registry, statement) {
		return getArraysCopy(points).reverse()
	},
	tag: 'reverse',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (points == undefined) {
					noticeByList(['No points could be found for a workStatement in reverse in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}

		var points = getPointsHD(registry, statement)

		if (points == undefined) {
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
		var antiregion = getRegion('antiregion', registry, statement)
		var id = statement.attributeMap.get('id')
		var matrix3D = getChainMatrix3D(registry, statement)
		var region = getRegion('region', registry, statement)
		var splitHeights = getFloatsByStatement('splitHeight', registry, statement)
		var stratas = getStratas(registry, statement)
		splitMesh(antiregion, id, matrix3D, mesh, region, registry, splitHeights, statement, stratas)
	},
	tag: 'split',
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
		var maximumSpan = getFloatByDefault('maximumSpan', registry, statement, this.tag, 1.0)
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0)
		var sagAngle = getFloatByDefault('sagAngle', registry, statement, this.tag, 15.0)
		taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle)
	},
	tag: 'taper',
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
		var center = getFloatsByDefault('center', registry, statement, this.tag, [0.0, 0.0])
		var matrix3D = getChainMatrix3D(registry, statement)
		var isOutside = getBooleanByDefault('outside', registry, statement, this.nam, etrue)
		var points = get3DsByMatrix3D(mesh.points, matrix3D)
		var pointIndexSet = getPointIndexSetByOutside(center, isOutside, points, mesh)
		if (pointIndexSet.size == 0) {
			return
		}
		var heights = getHeights(registry, statement, this.tag)
		var numberOfThreads = getIntByDefault('threads', registry, statement, this.tag, 1)
		var taperAngle = getFloatByDefault('taperAngle', registry, statement, this.tag, 30.0)
		var translations = getPointsByKey('translations', registry, statement)
		threadPoints(axials, center, heights, numberOfThreads, getBoundedPointsBySet(pointIndexSet, points), taperAngle, translations)
		mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
		removeClosePoints(mesh)
	},
	tag: 'thread',
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
	tag: 'triangulate',
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

var gVerticalBound = {
	getPoints: function(points, registry, statement) {
		var verticalBound = getFloatsByStatement('verticalBound', registry, statement)
		if (getIsEmpty(verticalBound)) {
			verticalBound = [0.0, 100.0]
		}

		if (verticalBound.length == 1) {
			if (verticalBound[0] > 0.0) {
				verticalBound.splice(0, 0, 0.0)
			}
			else {
				verticalBound.push(0.0)
			}
		}

		var boundingBox = getBoundingBox(points)
		if (boundingBox.length == 0) {
			return points
		}

		if (verticalBound[0] == undefined && verticalBound[1] == undefined) {
			return points
		}

		if (verticalBound[0] == undefined) {
			addArraysByIndex(points, verticalBound[1] - boundingBox[1][1], 1)
			return points
		}

		if (verticalBound[1] == undefined) {
			addArraysByIndex(points, verticalBound[0] - boundingBox[0][1], 1)
			return points
		}

		var boundingBoxHeight = boundingBox[1][1] - boundingBox[0][1]
		if (boundingBoxHeight == 0.0) {
			return points
		}

		var center = multiply2DScalar(getAddition2D(boundingBox[0], boundingBox[1]), 0.5)
		subtract2Ds(points, center)
		multiply2DsScalar(points, (verticalBound[1] - verticalBound[0]) / boundingBoxHeight)
		add2Ds(points, center)
		addArraysByIndex(points, (verticalBound[0] + verticalBound[1] - boundingBox[0][1] - boundingBox[1][1]) * 0.5, 1)
		return points
	},
	tag: 'verticalBound',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var points = getPointsHD(registry, workStatement)
				if (getIsEmpty(points)) {
					noticeByList(['No points could be found for a workStatement in verticalBound in alteration.', workStatement, statement])
				}
				else {
					points = this.getPoints(points, registry, statement)
					setPointsHD(getPointsExcept(points, registry, statement), workStatement)
				}
			}
			return
		}
	}
}

var gWedge = {
	alterMesh: function(mesh, registry, statement) {
		var inset = getPoint2DByDefault('inset', registry, statement, this.tag, [1.0, 1.0])
		var matrix3D = getChainMatrix3D(registry, statement)
		wedgeMesh(inset, matrix3D, mesh)
	},
	tag: 'wedge',
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
		var heights = getHeights(registry, statement, this.tag)
		var matrix3D = getChainMatrix3D(registry, statement)
		var pillarMesh = getExtrusionMesh(heights, matrix3D, polygons)
		this.alterMesh(pillarMesh, registry, statement)
		analyzeOutputMesh(pillarMesh, registry, statement)
	}
}

var gAlterationProcessors = [
gBend, gBevel, gExpand, gFillet, gMirror, gMirrorJoin, gMove, gMultiplyJoin,
gOutset, gPlacer, gPolygonate, gPolygonJoin, gPolylineJoin, gReverse, gSplit, gTaper, gThread, gTriangulate, gVerticalBound, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
