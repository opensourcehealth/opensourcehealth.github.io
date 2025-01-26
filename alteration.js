//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addConnectedSegmentsToPolygons(meetingMap, polygon, polygons, toolSegments, workSegments) {
	var connectedSegmentArrays = getPolynodes(toolSegments, workSegments)
	for (var extantPolygon of connectedSegmentArrays) {
		Vector.removeRepeats(extantPolygon)
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

function addMeshRegionToPointIndexSet(mesh, pointIndexSet, points, region, registry, statement) {
	if (mesh.intersectionIndexesMap != undefined && region.intersectionIDs != undefined) {
		for (var id of region.intersectionIDs) {
			if (mesh.intersectionIndexesMap.has(id)) {
				SetKit.addElementsToSet(pointIndexSet, mesh.intersectionIndexesMap.get(id))
			}
		}
	}

	if (mesh.splitIndexesMap != undefined && region.splitIDs != undefined) {
		for (var id of region.splitIDs) {
			if (mesh.splitIndexesMap.has(id)) {
				SetKit.addElementsToSet(pointIndexSet, mesh.splitIndexesMap.get(id))
			}
		}
	}

	addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement)
}

function addMirrorPoints(centerVector, mirrorStart, points) {
	var mirrorPoints = getMirrorPoints(centerVector, mirrorStart, points)
	trimBeginEnd(points, mirrorPoints)
	trimBeginEnd(mirrorPoints, points)
	Vector.pushArray(points, mirrorPoints)
}

function addPolygons2DToPointIndexSet(pointIndexSet, points, polygons) {
	for (var polygon of polygons) {
		var boundingBox = getBoundingBox(polygon)
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			if (isPointInsideBoundingBoxPolygonOrClose(boundingBox, points[pointIndex], polygon)) {
				pointIndexSet.add(pointIndex)
			}
		}
	}
}

function addPolygonsToPointIndexSet(pointIndexSet, points, polygons, stratas) {
	for (var polygon of polygons) {
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
}

function addPolygonStratasToPointIndexSet(pointIndexSet, points, polygonStratas) {
	if (polygonStratas == undefined) {
		return
	}

	for (var polygonStrata of polygonStratas) {
		if (polygonStrata.polygons.length == 0) {
			if (!Vector.isEmpty(polygonStrata.stratas[0])) {
				addWithinStratasToIndexSet(pointIndexSet, points, polygonStrata.stratas)
			}
		}
		else {
			addPolygonsToPointIndexSet(pointIndexSet, points, polygonStrata.polygons, polygonStrata.stratas)
		}
	}
}

function addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement) {
	addPolygonStratasToPointIndexSet(pointIndexSet, points, region.polygonStratas)
	if (region.pointStringSet != undefined) {
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			if (region.pointStringSet.has(points[pointIndex].slice(0,2).toString())) {
				pointIndexSet.add(pointIndex)
			}
		}
	}

	if (Vector.isEmpty(region.equations) || registry == undefined) {
		return
	}

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

function addSplitPointsToPolygon(polygon, splitHeight) {
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[1] > splitHeight != nextPoint[1] > splitHeight) {
			var along = (splitHeight - point[1]) / (nextPoint[1] - point[1])
			var betweenPoint = new Array(point.length)
			betweenPoint[1] = splitHeight
			for (var parameterIndex = 0; parameterIndex < point.length; parameterIndex++) {
				if (parameterIndex != 1) {
					betweenPoint[parameterIndex] = (1.0 - along) * point[parameterIndex] + along * nextPoint[parameterIndex]
				}
			}
			polygon.splice(vertexIndex + 1, 0, betweenPoint)
		}
	}
}

function addSplitPolygonByHeight(polygon, splitHeight, splitPolygons) {
	var alongIndexesMap = new Map()
	var isCounter = !Polygon.isClockwise(polygon)
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
	toolAlongIndexes.sort(Vector.compareElementZeroAscending)
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
	Vector.reverseArrays(toolSegments)
	addConnectedSegmentsToPolygons(meetingMap, polygon, splitPolygons, toolSegments, topSegments)
}

function addSplitPolygonsByHeight(polygons, splitHeight, splitPolygons) {
	for (var polygon of polygons) {
		addSplitPolygonByHeight(polygon, splitHeight, splitPolygons)
	}
}

function addSplitPolygonsByHeights(polygons, splitHeights, splitPolygons) {
	splitHeights.sort()
	for (var splitHeightIndex = 0; splitHeightIndex < splitHeights.length - 1; splitHeightIndex++) {
		var splitHeight = splitHeights[splitHeightIndex]
		addSplitPolygonsByHeight(polygons, splitHeight, splitPolygons)
		polygons = []
		for (var splitPolygonIndex = splitPolygons.length - 1; splitPolygonIndex > -1; splitPolygonIndex--) {
			var splitPolygon = splitPolygons[splitPolygonIndex]
			if (getBoundingSegment(splitPolygon, 1)[1] > splitHeight) {
				polygons.push(splitPolygon)
				splitPolygons.splice(splitPolygonIndex, 1)
			}
		}		
	}

	for (var splitHeightIndex = splitHeights.length - 1; splitHeightIndex < splitHeights.length; splitHeightIndex++) {
		addSplitPolygonsByHeight(polygons, splitHeights[splitHeightIndex], splitPolygons)
	}
}

function addStatementToMeshRegion(region, registry, statement) {
	addStatementToRegion(region, registry, statement)
	Vector.pushArray(region.intersectionIDs, getStrings('intersectionID', statement))
	Vector.pushArray(region.splitIDs, getStrings('splitID', statement))
}

function addStatementToRegion(region, registry, statement) {
	if (region.polygonStratas == undefined) {
		region.polygonStratas = []
	}

	var polygons = []
	region.polygonStratas.push({polygons:getPolygonsHDRecursively(registry, statement), stratas:getStratas(registry, statement)})
	var polylines = getChainPointListsHDRecursively(statement, 1, registry, statement, 'polyline')
	for (var polyline of polylines) {
		for (var point of polyline) {
			if (region.pointStringSet == undefined) {
				region.pointStringSet = new Set()
			}
			region.pointStringSet.add(point.slice(0,2).toString())
		}
	}

	region.equations = Vector.getPushArray(region.equations, getEquations('regionEquation', statement))
}

function addToMeshRegion(region, regionID, registry, statement) {
	if (regionID == 'this') {
		addStatementToMeshRegion(region, registry, statement)
		return
	}

	if (!registry.idMap.has(regionID)) {
		printArray(['No statement could be found for addToMeshRegion in alteration.', regionID, statement])
		return
	}

	addStatementToMeshRegion(region, registry, registry.idMap.get(regionID))
}

function addToRegion(region, regionID, registry, statement) {
	if (regionID == 'this') {
		addStatementToRegion(region, registry, statement)
		return
	}

	if (!registry.idMap.has(regionID)) {
		printCaller(['No statement could be found for addToRegion in alteration.', regionID, statement])
		return
	}

	addStatementToRegion(region, registry, registry.idMap.get(regionID))
}

function addWithinStratasToIndexSet(pointIndexSet, points, stratas) {
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		if (getIsInStratas(stratas, points[pointIndex][2])) {
			pointIndexSet.add(pointIndex)
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

function alterProcessorMesh(processor, registry, statement, workMeshes) {
	for (var workMesh of workMeshes) {
		processor.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(workMesh, registry, statement)
	}
}

function alterProcessorPoints(processor, registry, statement, workStatements) {
	for (var workStatement of workStatements) {
		var points = getPointsHD(registry, workStatement)
		if (points == undefined) {
			printCaller(['No points could be found for a workStatement in ' + processor.tag + '.', workStatement, statement])
		}
		else {
			points = processor.getPoints(points, registry, statement)
			setPointsHD(getPointsExcept(points, registry, statement), workStatement)
		}
	}
}

function analyzeOutputMesh(mesh, registry, statement) {
	if (mesh.id == undefined) {
		mesh.id = statement.attributeMap.get('id')
	}

	registry.meshMap.set(mesh.id, mesh)
	alterMeshExcept(mesh, registry, statement)
}

function bevelPointIndex(bevelMap, bevels, horizontalDirectionMap, pointIndex, points) {
	var point = points[pointIndex]
	if (point == undefined) {
		printCaller(['point is undefined in bevelPointIndex in alteration.', points, pointIndex])
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
		printCaller(['Unfaceted point in bevelPointIndex in alteration.', point, pointIndex, points])
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
			var crossProductZ = Math.abs(VectorFast.crossProduct2D(horizontalNormal, otherNormal))
			crossProductZ += gClose * Math.abs(VectorFast.dotProduct2D(horizontalNormal, otherNormal))
			if (crossProductZ > highestCrossProductZ && Math.abs(otherNormal[2]) < maximumZ) {
				highestCrossProductZ = crossProductZ
				highestCrossNormal = otherNormal
			}
		}
	}

	var addition = VectorFast.getAddition2D(Vector.normalize2D(horizontalNormal.slice(0, 2)), Vector.normalize2D(highestCrossNormal.slice(0, 2)))
	var multiplier = -2.0 * highestNormalZ / VectorFast.lengthSquared2D(addition)
	bevelMap.set(pointIndex, VectorFast.getMultiplication2D(VectorFast.multiply2DScalar(addition, multiplier), inset))
}

function bevelPoints(bevels, mesh, pointIndexSet, points) {
	var facets = mesh.facets
	if (Vector.isEmpty(bevels)) {
		return
	}

	bevels.sort(Vector.compareElementZeroAscending)
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
						MapKit.addElementToMapArray(horizontalDirectionMap, pointIndex, normal)
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
		VectorFast.add2D(points[pointIndex], bevelMap.get(pointIndex))
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
		VectorFast.add2D(mesh.points[key], VectorFast.getMultiplication2D(horizontalDirectionMap.get(key), expansionXY))
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
	var vector = VectorFast.getSubtraction2D(ultimatePoint, penultimatePoint)
	vector = [vector[1], -vector[0]]
	perpendicular = VectorFast.multiply2DScalar(VectorFast.getAddition2D(penultimatePoint, ultimatePoint), 0.5)
	var vectorLength = VectorFast.length2D(vector)
	if (vectorLength == 0.0) {
		vector = [1.0, 0.0]
	}
	else {
		VectorFast.divide2DScalar(vector, vectorLength)
	}

	return {center:perpendicular.slice(0), mirrorStart:mirrorStart - 2, vector:vector}
}

function getCenterVectorOnly(registry, statement, tag) {
	var centerVector = {center:getPoint2DByDefault('center', registry, statement, tag, [0.0, 0.0])}
	centerVector.vector = Vector.polarCounterclockwise(getFloatByDefault('direction', registry, statement, tag, 90.0) * gRadiansPerDegree)
	return centerVector
}

function getDirectionMapZ(facets, points) {
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != undefined) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				MapKit.addElementToMapArray(horizontalDirectionMap, pointIndex, normal)
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
		normals.sort(Vector.compareAbsoluteElementTwoAscending)
		var addition = VectorFast.getAddition2D(Vector.normalize2D(normals[0]), Vector.normalize2D(normals[1]))
		horizontalDirectionMap.set(key, VectorFast.multiply2DScalar(addition, 2.0 / VectorFast.lengthSquared2D(addition)))
	}
	return {deltaZ:maximumZ - minimumZ, horizontalDirectionMap:horizontalDirectionMap, minimumZ:minimumZ, maximumZ:maximumZ}
}

function getDotProduct2DRange(points, vector) {
	if (points.length == 0) {
		return [0.0, 0.0]
	}
	var minimumDotProduct = Number.MAX_VALUE
	var maximumDotProduct = -Number.MAX_VALUE
	for (var point of points) {
		var dotProduct = VectorFast.dotProduct2D(point, vector)
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
		var dotProduct = VectorFast.dotProduct3D(point, vector)
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
	var centerBeginDistance = VectorFast.distance2D(centerPoint, beginPoint)
	var beginTangentLength = 0.0
	var radiusMultiplier = 1.0
	if (tangentSidesMap.has(beginIndex)) {
		beginTangentLength = tangentSidesMap.get(beginIndex).tangentLength
	}

	var totalBeginLength = beginTangentLength + tangentLength
	if (totalBeginLength * gOneMinusClose > centerBeginDistance) {
		radiusMultiplier = centerBeginDistance / totalBeginLength
	}

	var centerEndDistance = VectorFast.distance2D(centerPoint, endPoint)
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
	var beginTangent = VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2DScalar(centerBegin, tangentLength - halfSideLength))
	var filletCenter = VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2DScalar(centerVector, radius / tangentSides.perpendicular))
	var filletAngle = 2.0 * absoluteHalfCornerAngle / numberOfFilletSides
	if (VectorFast.dotProduct2D([centerBegin[1], -centerBegin[0]], tangentSides.centerEnd) < 0.0) {
		filletAngle = -filletAngle
	}

	var filletedCorner = [beginTangent]
	var beginTangentCenter = VectorFast.getSubtraction2D(beginTangent, filletCenter)
	var filletRotation = Vector.polarCounterclockwise(filletAngle)
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		var beginTangentCenter = VectorFast.getRotation2DVector(beginTangentCenter, filletRotation)
		filletedCorner.push(VectorFast.add2D(filletCenter.slice(0), beginTangentCenter))
	}

	return filletedCorner
}

function getFilletedPolygonByIndexes(points, radius = 1.0, numberOfSides = gFillet.sides, pointIndexes) {
	var minimumAngle = gPI2 / numberOfSides
	if (pointIndexes == undefined) {
		pointIndexes = Vector.getSequence(points.length)
	}

	var tangentSidesMap = new Map()
	for (var pointIndex of pointIndexes) {
		var beginPoint = points[(pointIndex - 1 + points.length) % points.length]
		var centerPoint = points[pointIndex]
		var endPoint = points[(pointIndex + 1) % points.length]
		var centerBegin = VectorFast.getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = VectorFast.length2D(centerBegin)
		var centerEnd = VectorFast.getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = VectorFast.length2D(centerEnd)
		if (centerBeginLength > 0.0 && centerEndLength > 0.0) {
			VectorFast.divide2DScalar(centerBegin, centerBeginLength)
			VectorFast.divide2DScalar(centerEnd, centerEndLength)
			var twoOverAngle = 2.0 / minimumAngle
			var absoluteHalfCornerAngle = Math.acos(0.5 * VectorFast.distance2D(centerBegin, centerEnd))
			var cornerOverMinimum = twoOverAngle * absoluteHalfCornerAngle
			var numberOfFilletSides = Math.ceil(cornerOverMinimum - gClose)
			if (numberOfFilletSides > 1) {
				var centerVector = Vector.normalize2D(VectorFast.getAddition2D(centerBegin, centerEnd))
				var dotProduct = VectorFast.dotProduct2D(centerVector, centerBegin)
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
		Vector.pushArray(filletedPolygon, getFilletedCornerByMap(points, radius, pointIndex, tangentSidesMap))
	}

	return filletedPolygon
}

function getFilletedPolygonBySet(points, radius, numberOfSides, pointIndexSet) {
	var pointIndexes = Array.from(pointIndexSet)
	pointIndexes.sort(Vector.compareNumberAscending)
	return getFilletedPolygonByIndexes(points, radius, numberOfSides, pointIndexes)
}

function getFlatInterpolationAlongBeginEnd(x = 0, points) {
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

function getMeshRegion(key, registry, statement) {
	var value = getAttributeValue(key, statement)
	if (value == undefined) {
		return undefined
	}

	var regionIDs = value.split(' ').filter(lengthCheck)
	var region = {equations:[], pointStringSet:new Set(), polygons:[], polygonStratas:[]}
	region.intersectionIDs = []
	region.splitIDs = []
	for (var regionID of regionIDs) {
		addToMeshRegion(region, regionID, registry, statement)
	}

	return region
}

function getMirrorPoints(centerVector, mirrorStart, points) {
	var mirrorPoints = Polyline.copy(points.slice(0, mirrorStart))
	mirrorPoints.reverse()
	mirrorPointsByCenterVector(centerVector, mirrorPoints)
	return mirrorPoints
}

function getOutsetPolygonsByStatement(points, registry, statement, tag) {
	var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
	var checkIntersection = getBooleanByDefault('checkIntersection', registry, statement, tag, true)
	var clockwise = getBooleanByStatement('clockwise', registry, statement)
	if (clockwise == undefined) {
		clockwise = Polygon.isClockwise(points)
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
	if (Vector.isEmpty(outsets)) {
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

function getPointIndexSetByMeshRegionIDs(antiregion, points, mesh, region, registry, statement) {
	var pointIndexSet = new Set()
	if (region == undefined) {
		SetKit.addRangeToSet(pointIndexSet, 0, points.length)
	}
	else {
		addMeshRegionToPointIndexSet(mesh, pointIndexSet, points, region, registry, statement)
	}

	if (antiregion == undefined) {
		return pointIndexSet
	}

	var removalIndexSet = new Set()
	addMeshRegionToPointIndexSet(mesh, removalIndexSet, points, antiregion, registry, statement)
	SetKit.deleteElementsFromSet(pointIndexSet, removalIndexSet)
	return pointIndexSet
}

function getPointIndexSetByOutside(center, isOutside, points, mesh) {
	var pointIndexSet = new Set()
	for (var facet of mesh.facets) {
		var facetCenter = getCenter(facet, points)
		var normal = getNormalByFacet(facet, points)
		var centerFacet = VectorFast.getSubtraction2D(facetCenter, center)
		var centerFacetLength = VectorFast.length2D(centerFacet)
		if (centerFacetLength > 0.0) {
			VectorFast.divide3DScalar(centerFacet, centerFacetLength)
		}
		var dotProduct = VectorFast.dotProduct2D(normal, centerFacet)
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

function getPointIndexSetByRegionIDs(antiregion, points, region, registry, statement) {
	var pointIndexSet = new Set()
	if (region == undefined) {
		SetKit.addRangeToSet(pointIndexSet, 0, points.length)
	}
	else {
		addRegionToPointIndexSet(pointIndexSet, points, region, registry, statement)
	}

	if (antiregion == undefined) {
		return pointIndexSet
	}

	var removalIndexSet = new Set()
	addRegionToPointIndexSet(removalIndexSet, points, antiregion, registry, statement)
	SetKit.deleteElementsFromSet(pointIndexSet, removalIndexSet)
	return pointIndexSet
}

function getPointsExcept(points, registry, statement) {
	var alterationString = statement.attributeMap.get('alteration')
	if (alterationString != undefined) {
		var alterations = alterationString.replaceAll(',', ' ').split(' ').filter(lengthCheck)
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
	var region = {}
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
		VectorFast.rotate2DVector(point, reverseRotation)
		point[1] = mirrorFromY - point[1]
		VectorFast.rotate2DVector(point, centerVector.vector)
	}
}

var gPlacer = {
	getPoints: function(points, registry, statement) {
		var placerPoints = Polyline.copy(points)
		if (statement.attributeMap.has('placerPoints')) {
			placerPoints = getPointsByValue(registry, statement, statement.attributeMap.get('placerPoints'))
		}

		if (placerPoints.length < 2) {
			printCaller(['placerPoints.length < 2 in placer in alteration.', points, placerPoints, statement])
			return points
		}

		var begin = placerPoints[0]
		var end = placerPoints[placerPoints.length - 1]
		var beginEnd = VectorFast.getSubtraction2D(end, begin)
		var beginEndLength = VectorFast.length2D(beginEnd)
		if (beginEndLength == 0.0) {
			printCaller(['beginEndLength == 0.0 in placer in alteration.', points, placerPoints, statement])
			return points
		}

		var center = VectorFast.multiply2DScalar(VectorFast.getAddition2D(begin, end), 0.5)
		var direction = getFloatByDefault('direction', registry, statement, this.tag, 90.0)
		var distance = getFloatByDefault('distance', registry, statement, this.tag, 10.0)
		VectorFast.multiply2DScalar(beginEnd, distance / beginEndLength)
		VectorFast.add2D(center, VectorFast.rotate2DVector(beginEnd, Vector.polarCounterclockwise(direction * gRadiansPerDegree)))
		var variableMap = getVariableMapByStatement(statement.parent)
		variableMap.set('placerX', center[0].toString())
		variableMap.set('placerY', center[1].toString())
		return points
	},
	tag: 'placer',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
		}
		else {
			printCaller(['No workStatements could be found for placer in alteration.', statement])
		}
	}
}

function removeDeadEnds(facets) {
	for (var facet of facets) {
		var originalLength = facet.length
		for (var vertexIndex = 0; vertexIndex < originalLength; vertexIndex++) {
			var nextNextIndex = (vertexIndex + 2) % originalLength
			if (facet[vertexIndex] == facet[nextNextIndex]) {
				facet[(vertexIndex + 1) % originalLength] = undefined
				facet[nextNextIndex] = undefined
			}
		}

		Vector.removeUndefineds(facet)
	}
}

var roundProcessor = {
	alterMesh: function(mesh, registry, statement) {
		return roundPoints(mesh.points, getIntByDefault('decimalPlaces', registry, statement, this.tag, 1))
	},
	getPoints: function(points, registry, statement) {
		return roundPoints(points, getIntByDefault('decimalPlaces', registry, statement, this.tag, 1))
	},
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		for (var workMesh of workMeshes) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(workMesh, registry, statement)
		}

		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
		}

		printCaller(['No work mesh or points could be found for round in alteration.', statement])
	},
	tag: 'round'
}

function setPointsExcept(points, registry, statement) {
	setPointsHD(getPointsExcept(points, registry, statement), statement)
}

function splitMesh(antiregion, id, matrix3D, mesh, region, registry, splitHeights, statement) {
	if (mesh == undefined || Vector.isEmpty(splitHeights)) {
		return
	}

	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
	var facets = mesh.facets
	var points = mesh.points
	for (var splitHeight of splitHeights) {
		var pointIndexSet = getPointIndexSetByMeshRegionIDs(antiregion, points, mesh, region, registry, statement)
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
	removeTooThinFacets(mesh)
	removeUnfacetedPoints(mesh)
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
	var insetPolygon = getOutsetPolygon(highestPolygon, [-inset, -inset])
	var height = overhangSlope * inset + highestFacetZ
	var insetFacet = new Array(highestFacet.length)
	var pointsLength = inversePoints.length
	Vector.pushArray(inversePoints, insetPolygon)
	for (var vertexIndex = 0; vertexIndex < highestFacet.length; vertexIndex++) {
		insetFacet[vertexIndex] = pointsLength
		inversePoints[pointsLength][2] = height
		pointsLength += 1
	}
	addFacetsByBottomTopFacet(highestFacet, facets, insetFacet)
	facets[highestFacetIndex] = insetFacet.reverse()
	Vector.pushArray(originalPoints, get3DsByMatrix3D(inversePoints.slice(originalPoints.length), getInverseRotationTranslation3D(matrix3D)))
	mesh.points = originalPoints
}

function threadPointByAxials(axials, center, heights, point, taperAngle, translations) {
	var centerPoint = VectorFast.getSubtraction2D(point, center)
	var centerPointLength = VectorFast.length2D(centerPoint)
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
		if (!Vector.isEmpty(heights)) {
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
	VectorFast.multiply2DScalar(centerPoint, radialMultiplier * (interpolation[1] + axialInterpolation[2]) / centerPointLength)
	VectorFast.add2D(point, centerPoint)
	var rotationVector = Vector.polarCounterclockwise(interpolation[2] * gRadiansPerDegree)
	VectorFast.subtract2D(point, center)
	VectorFast.rotate2DVector(point, rotationVector)
	VectorFast.add2D(point, center)
	point[2] += interpolation[0]
}

function threadPointByTranslations(center, heights, numberOfThreads, point, taperPortion, translations) {
	var centerPoint = VectorFast.getSubtraction2D(point, center)
	var centerPointLength = VectorFast.length2D(centerPoint)
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
		if (!Vector.isEmpty(heights)) {
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
	VectorFast.multiply2DScalar(centerPoint, radialMultiplier * interpolation[1] / centerPointLength)
	VectorFast.add2D(point, centerPoint)
	var rotationVector = Vector.polarCounterclockwise(interpolation[2] * gRadiansPerDegree)
	VectorFast.subtract2D(point, center)
	VectorFast.rotate2DVector(point, rotationVector)
	VectorFast.add2D(point, center)
	point[2] += interpolation[0]
}

function threadPoints(axials, center, heights, numberOfThreads, points, taperAngle, translations) {
	var maximumLength = 0
	for (var translation of translations) {
		maximumLength = Math.max(maximumLength, translation.length)
	}

	for (var translation of translations) {
		translation.length = maximumLength
		Vector.setUndefinedElementsToValue(translation, 0)
	}

	if (Vector.isEmpty(axials)) {
		var taperPortion = taperAngle / 360.0
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
		Vector.setUndefinedElementsToValue(axial, 0)
	}

	for (var point of points) {
		threadPointByAxials(axials, center, heights, point, taperAngle, translations)
	}
}

var transform3DProcessor = {
	alterMesh: function(mesh, registry, statement) {
		var antiregion = getMeshRegion('antiregion', registry, statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsByMatrix3D(mesh.points, matrix3D)
		var region = getMeshRegion('region', registry, statement)
		var regionTransform3D = getChainMatrix3D(registry, statement, 'regionTransform3D')
		var pointIndexSet = getPointIndexSetByMeshRegionIDs(antiregion, points, mesh, region, registry, statement)
		transform3DPointsBySet(regionTransform3D, pointIndexSet, points)
		mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
		removeClosePoints(mesh)
	},
	getPoints: function(points, registry, statement) {
		var antiregion = getRegion('antiregion', registry, statement)
		var region = getRegion('region', registry, statement)
		for (var point of points) {
			if (point.length < 3) {
				point.length = 3
				Vector.setUndefinedElementsToValue(point)				
			}
		}

		var pointIndexSet = getPointIndexSetByRegionIDs(antiregion, points, region, registry, statement)
		transform3DPointsBySet(getChainMatrix3D(registry, statement, 'regionTransform3D'), pointIndexSet, points)
		return points
	},
	tag: 'transform3D',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		for (var workMesh of workMeshes) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(workMesh, registry, statement)
		}

		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
			return
		}

		printCaller(['No work mesh or points could be found for bend in alteration.', statement])
	}
}

function transformPoints2DByEquation(center, points, registry, statement, translationEquations, translations, vector) {
	if (!Vector.isEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point)
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
					VectorFast.add2D(point, value)
				}
			}
		}
	}

	if (Vector.isEmpty(center)) {
		center = [0.0, 0.0]
	}

	if (Vector.length == 1) {
		Vector.push(0.0)
	}

	Vector.normalize2D(vector)
	if (distanceTransformation.distanceTranslates.length > 0) {
		var until = 2 + 1 * (distanceTransformation.distanceTranslates[0].length > 3)
		for (var point of points) {
			if (until > 2) {
				Vector.lengthenSetUndefinedElements(point, 3)
			}
			var x = VectorFast.dotProduct2D(vector, VectorFast.getSubtraction2D(point, center))
			VectorFast.addArray(point, Vector.linearArrayInterpolation(distanceTransformation.distanceTranslates, x), until)
		}
	}

	if (distanceTransformation.distanceTransforms.length > 0) {
		for (var point of points) {
			var x = VectorFast.dotProduct2D(vector, VectorFast.getSubtraction2D(point, center))
			transform2DPoint(Vector.linearArrayInterpolation(distanceTransformation.distanceTransforms, x), point)
		}
	}

	if (distanceTransformation.distanceTransform3Ds.length > 0) {
		for (var point of points) {
			Vector.lengthenSetUndefinedElements(point, 3)
			var x = VectorFast.dotProduct2D(vector, VectorFast.getSubtraction2D(point, center))
			transform3DPoint(point, Vector.linearArrayInterpolation(distanceTransformation.distanceTransform3Ds, x))
		}
	}

	if (Vector.isEmpty(translations)) {
		return
	}

	for (var point of points) {
		VectorFast.add2D(point, additionInterpolation2D(VectorFast.dotProduct2D(vector, VectorFast.getSubtraction2D(point, center)), translations))
	}
}

function transformPoints3DByEquation(distanceTransformation, center, points, registry, statement, translationEquations, translations, vector) {
	if (!Vector.isEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point)
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
					VectorFast.add3D(point, value)
				}
			}
		}
	}

	if (distanceTransformation.distanceTranslates.length > 0) {
		for (var point of points) {
			var x = VectorFast.dotProduct3D(vector, VectorFast.getSubtraction3D(point, center))
			VectorFast.add3D(point, Vector.linearArrayInterpolation(distanceTransformation.distanceTranslates, x))
		}
	}

	if (distanceTransformation.distanceTransforms.length > 0) {
		for (var point of points) {
			var x = VectorFast.dotProduct3D(vector, VectorFast.getSubtraction3D(point, center))
			transform2DPoint(Vector.linearArrayInterpolation(distanceTransformation.distanceTransforms, x), point)
		}
	}

	if (distanceTransformation.distanceTransform3Ds.length > 0) {
		for (var point of points) {
			var x = VectorFast.dotProduct3D(vector, VectorFast.getSubtraction3D(point, center))
			transform3DPoint(point, Vector.linearArrayInterpolation(distanceTransformation.distanceTransform3Ds, x))
		}
	}

	if (Vector.isEmpty(translations)) {
		return
	}

	for (var point of points) {
		var dotProduct = VectorFast.dotProduct3D(vector, VectorFast.getSubtraction3D(point, center))
		VectorFast.add3D(point, additionInterpolation3D(dotProduct, translations))
	}
}

function trimBeginEnd(beginPoints, endPoints) {
	var endPoint = endPoints[endPoints.length - 1]
	if (VectorFast.distanceSquaredArray(beginPoints[0], endPoint) > gCloseSquared) {
		return
	}

	if (endPoints.length > 1 && beginPoints.length > 1) {
		var midpoint = VectorFast.multiplyArrayScalar(VectorFast.getAdditionArray(beginPoints[1], endPoints[endPoints.length - 2]), 0.5)
		if (VectorFast.distanceSquaredArray(midpoint, endPoint) < gCloseSquared) {
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
		var insetAtZ = VectorFast.getMultiplication2DScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = VectorFast.add2D(centerPoint.slice(0), VectorFast.getMultiplication2D(horizontalDirectionMap.get(key), insetAtZ))
	}
	mesh.points = get3DsByMatrix3D(mesh.points, getInverseRotationTranslation3D(matrix3D))
}

var gBend = {
alterMesh: function(mesh, registry, statement) {
	var antiregion = getMeshRegion('antiregion', registry, statement)
	var distanceTransformation = this.getDistanceTransformation(registry, statement)
	var matrix3D = getChainMatrix3D(registry, statement)
	var points = get3DsByMatrix3D(mesh.points, matrix3D)
	var region = getMeshRegion('region', registry, statement)
	var pointIndexSet = getPointIndexSetByMeshRegionIDs(antiregion, points, mesh, region, registry, statement)
	var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
	var translations = getFloatListsByStatement('translation', registry, statement)
	var center = getFloatsByDefault('center', registry, statement, statement.tag, [0.0, 0.0, 0.0])
	var translationEquations = getEquations('translationEquation', statement)
	var vector = getVector3DByStatement(registry, statement)
	transformPoints3DByEquation(distanceTransformation, center, boundedPoints, registry, statement, translationEquations, translations, vector)
	mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
	removeClosePoints(mesh)
},

getDistanceTransformation: function(registry, statement) {
	var distanceTransformation = {}
	distanceTransformation.distanceTransforms = this.getDistanceTransformationEntry('distanceTransform', registry, statement)
	for (var distanceTransform of distanceTransformation.distanceTransforms) {
		var transform = getUnitMatrix2D()
		var transformString = distanceTransform[1]
		if (transformString.length > 0) {
			transform = getMatrix2DByWords(registry, statement, getBracketSeparatedWords(transformString))
		}
		distanceTransform.length = 1
		Vector.pushArray(distanceTransform, transform)
	}

	this.setDistanceTransformationAttribute(distanceTransformation.distanceTransforms, 'distanceTransform', statement)

	distanceTransformation.distanceTransform3Ds = this.getDistanceTransformationEntry('distanceTransform3D', registry, statement)
	for (var distanceTransform3D of distanceTransformation.distanceTransform3Ds) {
		var transform3D = getUnitMatrix3D()
		var transform3DString = distanceTransform3D[1]
		if (transform3DString.length > 0) {
			transform3D = getMatrix3DByWords(registry, statement, getBracketSeparatedWords(transform3DString))
		}
		distanceTransform3D.length = 1
		Vector.pushArray(distanceTransform3D, transform3D)
	}

	this.setDistanceTransformationAttribute(distanceTransformation.distanceTransform3Ds, 'distanceTransform3D', statement)

	distanceTransformation.distanceTranslates = this.getDistanceTransformationEntry('distanceTranslate', registry, statement)
	for (var distanceTranslate of distanceTransformation.distanceTranslates) {
		var translate = [0.0, 0.0, 0.0]
		var translateString = distanceTranslate[1]
		if (translateString.length > 0) {
			translate = getFloatsUpdateByStatementValue(registry, statement, translateString)[0]
			translate.length = Math.max(translate.length, 3)
			Vector.setUndefinedElementsToValue(translate)
		}
		distanceTranslate.length = 1
		Vector.pushArray(distanceTranslate, translate)
	}

	this.setDistanceTransformationAttribute(distanceTransformation.distanceTranslates, 'distanceTranslate', statement)

	return distanceTransformation
},

getDistanceTransformationEntry: function(key, registry, statement) {
	var distanceTransformValue = statement.attributeMap.get(key)
	if (distanceTransformValue == undefined) {
		return []
	}

	var distanceTransformEntry = []
	var distanceTransformStrings = distanceTransformValue.split(' ').filter(lengthCheck)
	for (var distanceTransformString of distanceTransformStrings) {
		var indexOfComma = getIndexOfUnbracketed(distanceTransformString, ',')
		if (indexOfComma > -1) {
			var along = 0.0
			var alongString = distanceTransformString.slice(0, indexOfComma).trim()
			if (alongString.length > 0) {
				along = getFloatByStatementValue(registry, statement, alongString)
			}
			distanceTransformEntry.push([along, distanceTransformString.slice(indexOfComma + 1).trim()])
		}
	}

	return distanceTransformEntry
},

getPoints: function(points, registry, statement) {
	var antiregion = getRegion('antiregion', registry, statement)
	var region = getRegion('region', registry, statement)
	var pointIndexSet = getPointIndexSetByRegionIDs(antiregion, points, region, registry, statement)
	var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
	if (Vector.isEmpty(boundedPoints)) {
		return points
	}

	var translations = getFloatListsByStatement('translation', registry, statement)
	var center = getFloatsByDefault('center', registry, statement, statement.tag, [0.0, 0.0])
	var translationEquations = getEquations('translationEquation', statement)
	var vector = getVector2DByStatement(registry, statement)
	transformPoints2DByEquation(center, boundedPoints, registry, statement, translationEquations, translations, vector)
	return points
},

initialize: function() {
	gCopyIDKeySet.add('region')
},

processStatement:function(registry, statement) {
	convertToGroupIfParent(statement)
	var workMeshes = getWorkMeshes(registry, statement)
	if (workMeshes.length > 0) {
		alterProcessorMesh(this, registry, statement, workMeshes)
		return
	}

	var workStatements = getWorkStatements(registry, statement)
	if (workStatements.length > 0) {
		alterProcessorPoints(this, registry, statement, workStatements)
		return
	}

	printCaller(['No work mesh or points could be found for bend in alteration.', statement])
},

setDistanceTransformationAttribute: function(distanceTransformations, key, statement) {
	if (distanceTransformations.length > 0) {
		statement.attributeMap.set(key, distanceTransformations.join(','))
	}
},

tag: 'bend'
}

var gBevel = {
alterMesh: function(mesh, registry, statement) {
	var antiregion = getMeshRegion('antiregion', registry, statement)
	var bevels = getPointsByKey('bevel', registry, statement)
	var matrix3D = getChainMatrix3D(registry, statement)
	var points = get3DsByMatrix3D(mesh.points, matrix3D)
	var region = getMeshRegion('region', registry, statement)
	var pointIndexSet = getPointIndexSetByMeshRegionIDs(antiregion, points, mesh, region, registry, statement)
	if (pointIndexSet.size == 0) {
		return
	}

	bevelPoints(bevels, mesh, pointIndexSet, points)
	mesh.points = get3DsByMatrix3D(points, getInverseRotationTranslation3D(matrix3D))
},

processStatement:function(registry, statement) {
	convertToGroupIfParent(statement)
	var workMeshes = getWorkMeshes(registry, statement)
	if (workMeshes.length > 0) {
		alterProcessorMesh(this, registry, statement, workMeshes)
		return
	}

	printCaller(['No work mesh could be found for bevel in alteration.', statement])
},

tag: 'bevel'
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
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		printCaller(['No work mesh could be found for expand in alteration.', statement])
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
		var pointIndexSet = getPointIndexSetByRegionIDs(antiregion, points, region, registry, statement)
		return getFilletedPolygonBySet(points, radius, numberOfSides, pointIndexSet)
	},
	tag: 'fillet',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
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
		alterProcessorMesh(this, registry, statement, workMeshes)
		return
	}

	var workStatements = getWorkStatements(registry, statement)
	if (workStatements.length > 0) {
		alterProcessorPoints(this, registry, statement, workStatements)
		return
	}

	var points = getPointsHD(registry, statement)
	if (points == undefined) {
		printCaller(['No work mesh or points could be found for mirror in alteration.', statement])
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
		alterProcessorMesh(this, registry, statement, workMeshes)
		return
	}

	var workStatements = getWorkStatements(registry, statement)
	if (workStatements.length > 0) {
		alterProcessorPoints(this, registry, statement, workStatements)
		return
	}

	var points = getPointsHD(registry, statement)
	if (points == undefined) {
		printCaller(['No work mesh or points could be found for mirrorJoin in alteration.', statement])
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
	if (Vector.isEmpty(lowerLeft)) {
		var center = getFloatsByStatement('center', registry, statement)
		var size = VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0])
		if (Vector.isEmpty(center)) {
			var bedSize = getFloatsByStatement('bedSize', registry, statement)
			if (!Vector.isEmpty(bedSize)) {
				if (bedSize.length == 1) {
					bedSize.push(bedSize[0])
				}
				if (size[0] > bedSize[0] || size[1] > bedSize[1]) {
					warningByList(['The mesh is bigger than the bed.', statement, size, bedSize])
				}
				center = VectorFast.getMultiplication2DScalar(bedSize, 0.5)
			}
		}
		if (!Vector.isEmpty(center)) {
			lowerLeft = VectorFast.getSubtraction2D(center, VectorFast.multiply2DScalar(size, 0.5))
		}
	}

	if (Vector.isEmpty(lowerLeft)) {
		lowerLeft = [0.0]
	}

	if (lowerLeft.length == 1) {
		lowerLeft.push(lowerLeft[0])
	}

	if (lowerLeft.length == 2) {
		lowerLeft.push(0.0)
	}

	Polyline.add3D(mesh.points, VectorFast.getSubtraction3D(lowerLeft, boundingBox[0]))
	statement.attributeMap.set('lowerLeft', lowerLeft.toString())
	statement.attributeMap.set('boundingBox', getMeshBoundingBox(mesh).toString())
},

getPoints: function(points, registry, statement) {
	if (Vector.isEmpty(points)) {
		return points
	}

	var boundingBox = getBoundingBox(points)
	var lowerLeft = getFloatsByStatement('lowerLeft', registry, statement)
	if (Vector.isEmpty(lowerLeft)) {
		var center = getFloatsByStatement('center', registry, statement)
		if (!Vector.isEmpty(center)) {
			lowerLeft =
			VectorFast.getSubtraction2D(center, VectorFast.multiply2DScalar(VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0]), 0.5))
		}
	}

	if (Vector.isEmpty(lowerLeft)) {
		lowerLeft = [0.0]
	}

	if (lowerLeft.length == 1) {
		lowerLeft.push(lowerLeft[0])
	}

	Polyline.add2D(points, VectorFast.getSubtraction2D(lowerLeft, boundingBox[0]))
	points = getPolygonRotatedToLower(points)
	statement.attributeMap.set('lowerLeft', lowerLeft.toString())
	statement.attributeMap.set('boundingBox', getBoundingBox(points).toString())
	return points
},

processStatement: function(registry, statement) {
	var workMeshes = getWorkMeshes(registry, statement)
	if (workMeshes.length > 0) {
		alterProcessorMesh(this, registry, statement, workMeshes)
		return
	}

	var workStatements = getWorkStatements(registry, statement)
	if (workStatements.length > 0) {
		alterProcessorPoints(this, registry, statement, workStatements)
	}

	var points = getPointsHD(registry, statement)
	if (points == undefined) {
		printCaller(['No work mesh or points could be found for move in alteration.', statement])
		return
	}

	statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polygon')
	points = this.getPoints(points, registry, statement)
	setPointsExcept(points, registry, statement)
},

tag: 'move'
}

var gMultiplyJoin = {
	alterMesh: function(mesh, registry, statement) {
		var vector = getVector3DByStatement(registry, statement)
		var increments = getFloatsByStatement('increment', registry, statement)
		if (Vector.isEmpty(increments)) {
			var dotProductRange = getDotProduct3DRange(mesh.points, vector)
			increments = [dotProductRange[1] - dotProductRange[0]]
		}
		var quantity = getIntByDefault('quantity', registry, statement, this.tag, 2)
		if (Math.abs(quantity) < 2) {
			return
		}
		if (quantity < 0) {
			Vector.reverseSigns(increments)
			quantity = -quantity
		}
		var meshCopy = getMeshCopy(mesh)
		var translation = [0.0, 0.0, 0.0]
		for (var additionIndex = 0; additionIndex < quantity - 1; additionIndex++) {
			var additionMesh = getMeshCopy(meshCopy)
			VectorFast.add3D(translation, VectorFast.getMultiplication3DScalar(vector, increments[additionIndex % increments.length]))
			Polyline.add3D(additionMesh.points, translation)
			addMeshToJoinedMesh(mesh, additionMesh)
		}
	},
	getPoints: function(points, registry, statement) {
		if (Vector.isEmpty(points)) {
			printCaller(['No points for multiplyJoin in alteration.', statement])
			return points
		}
		var vector = getVector2DByStatement(registry, statement)
		var increments = getFloatsByStatement('increment', registry, statement)
		if (Vector.isEmpty(increments)) {
			var dotProductRange = getDotProduct2DRange(points, vector)
			increments = [dotProductRange[1] - dotProductRange[0]]
		}
		var quantity = getIntByDefault('quantity', registry, statement, this.tag, 2)
		if (Math.abs(quantity) < 2) {
			return points
		}
		if (quantity < 0) {
			Vector.reverseSigns(increments)
			quantity = -quantity
		}
		var multipliedPoints = Polyline.copy(points)
		var translation = [0.0, 0.0, 0.0]
		for (var additionIndex = 0; additionIndex < quantity - 1; additionIndex++) {
			var additionPoints = Polyline.copy(multipliedPoints)
			VectorFast.add2D(translation, VectorFast.getMultiplication2DScalar(vector, increments[additionIndex % increments.length]))
			Polyline.add2D(additionPoints, translation)
			if (VectorFast.distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
				additionPoints.splice(0, 1)
			}
			Vector.pushArray(points, additionPoints)
		}
		return points
	},
	tag: 'multiplyJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			printCaller(['No work mesh or points could be found for multiplyJoin in alteration.', statement])
			return
		}

		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polyline')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gOutset = {
getPoints: function(points, registry, statement) {
	return getLargestPolygon(getOutsetPolygonsByStatement(points, registry, statement, this.tag))
},

tag: 'outset',

processStatement:function(registry, statement) {
	var workStatements = getWorkStatements(registry, statement)
	if (workStatements.length > 0) {
		alterProcessorPoints(this, registry, statement, workStatements)
		return
	}

	var points = getPointsHD(registry, statement)
	if (points == undefined) {
		printCaller(['No points could be found for outset in alteration.', statement])
		return
	}

	statement.tag = 'polygon'
	var outsetPolygons = getOutsetPolygonsByStatement(points, registry, statement, this.tag)
	if (Vector.isEmpty(outsetPolygons)) {
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
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		printCaller(['No work mesh could be found for polygonate in alteration.', statement])
	}
}

var gPolygonJoin = {
	alterMesh: function(mesh, registry, statement) {
		var betweenAlign = getFloatByDefault('betweenAlign', registry, statement, this.tag, 0.0)
		var path = getPath2DByStatement(registry, statement)
		if (path.length == 0) {
			return
		}
		var beginPoint = path[0]
		if (path.length == 1) {
			Polyline.add2D(mesh.points, beginPoint)
			return
		}
		var endsBetween = getEndsBetween(mesh)
		var beginEnd = VectorFast.getSubtraction2D(path[1], beginPoint)
		var beginEndLength = VectorFast.length2D(beginEnd)
		VectorFast.divide2DScalar(beginEnd, beginEndLength)
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
		var beforeBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, beforePoint))
		var beforeEnd = Vector.normalize2D(VectorFast.getAddition2D(beforeBegin, beginEnd))
		var dotProduct = Math.max(VectorFast.dotProduct2D(beforeEnd, beforeBegin), 0.01)
		var leftMatrix2D = getMatrix2DByTranslate([-endsBetween.leftX])
		leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByScale([1.0, 1.0 / dotProduct]), leftMatrix2D)
		leftMatrix2D = getMultiplied2DMatrix(getMatrix2DByRotationVectorTranslation(beforeEnd, beginPoint), leftMatrix2D)
		transform2DPointsByFacet(endsBetween.leftAll, leftMatrix2D, mesh.points)
		var pointIndexMap = new Map()
		for (var outerIndex = 1; outerIndex < path.length; outerIndex++) {
			beginPoint = path[outerIndex]
			beginEnd = VectorFast.getSubtraction2D(path[(outerIndex + 1) % path.length], beginPoint)
			beginEndLength = VectorFast.length2D(beginEnd)
			VectorFast.divide2DScalar(beginEnd, beginEndLength)
			var additionCopy = getMeshCopy(meshCopy)
			var betweenMatrix2D = getMatrix2DByTranslate([betweenAlign * (beginEndLength - endsBetween.rightX)])
			var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
			betweenMatrix2D = getMultiplied2DMatrix(matrix2D, betweenMatrix2D)
			transform2DPointsByFacet(endsBetween.betweens, betweenMatrix2D, additionCopy.points)
			var beforePoint = path[outerIndex - 1]
			var beforeBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, beforePoint))
			var beforeEnd = Vector.normalize2D(VectorFast.getAddition2D(beforeBegin, beginEnd))
			var dotProduct = Math.max(VectorFast.dotProduct2D(beforeEnd, beforeBegin), 0.01)
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
		if (Vector.isEmpty(points)) {
			printCaller(['No points for polygonJoin in alteration.', statement])
			return points
		}
		var path = getPath2DByStatement(registry, statement)
		var originalPoints = Polyline.copy(points)
		points.length = 0
		for (var vertexIndex = 0; vertexIndex < path.length; vertexIndex++) {
			var beginPoint = path[vertexIndex]
			var beginEnd = Vector.normalize2D(VectorFast.getSubtraction2D(path[(vertexIndex + 1) % path.length], beginPoint))
			var additionPoints = Polyline.getRotation2DVector(originalPoints, beginEnd)
			Polyline.add2D(additionPoints, beginPoint)
			if (points.length > 0) {
				if (VectorFast.distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
					additionPoints.splice(0, 1)
				}
			}
			Vector.pushArray(points, additionPoints)
		}
		return points
	},
	tag: 'polygonJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			printCaller(['No work mesh or points could be found for polygonJoin in alteration.', statement])
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
			Polyline.add2D(mesh.points, beginPoint)
			return
		}
		var endsBetween = getEndsBetween(mesh)
		var beginEnd = VectorFast.getSubtraction2D(path[1], beginPoint)
		var beginEndLength = VectorFast.length2D(beginEnd)
		VectorFast.divide2DScalar(beginEnd, beginEndLength)
		var meshCopy = getMeshCopy(mesh)
		var rightOffset = beginEndLength - endsBetween.rightX
		var betweenOffset = betweenAlign * rightOffset
		for (var pointIndex of endsBetween.betweens) {
			mesh.points[pointIndex][0] += betweenOffset
		}
		var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
		transform2DPointsByFacet(endsBetween.betweens, matrix2D, mesh.points)
		transform2DPointsByFacet(endsBetween.leftAll, matrix2D, mesh.points)
		var pointIndexMap = new Map()
		for (var outerIndex = 1; outerIndex < path.length - 1; outerIndex++) {
			beginPoint = path[outerIndex]
			beginEnd = VectorFast.getSubtraction2D(path[outerIndex + 1], beginPoint)
			beginEndLength = VectorFast.length2D(beginEnd)
			VectorFast.divide2DScalar(beginEnd, beginEndLength)
			var additionCopy = getMeshCopy(meshCopy)
			var betweenMatrix2D = getMatrix2DByTranslate([betweenAlign * (beginEndLength - endsBetween.rightX)])
			var matrix2D = getMatrix2DByRotationVectorTranslation(beginEnd, beginPoint)
			betweenMatrix2D = getMultiplied2DMatrix(matrix2D, betweenMatrix2D)
			transform2DPointsByFacet(endsBetween.betweens, betweenMatrix2D, additionCopy.points)
			var beforePoint = path[outerIndex - 1]
			var beforeBegin = Vector.normalize2D(VectorFast.getSubtraction2D(beginPoint, beforePoint))
			var beforeEnd = Vector.normalize2D(VectorFast.getAddition2D(beforeBegin, beginEnd))
			var dotProduct = Math.max(VectorFast.dotProduct2D(beforeEnd, beforeBegin), 0.01)
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
		transform2DPointsByFacet(Vector.addArrayScalar(endsBetween.rightAll, mesh.points.length - meshCopy.points.length), matrix2D, mesh.points)
		updateMeshByPointMap(mesh, pointIndexMap)
		removeUnfacetedPoints(mesh)
	},
	getPoints: function(points, registry, statement) {
		if (Vector.isEmpty(points)) {
			printCaller(['No points for polylineJoin in alteration.', statement])
			return points
		}
		var path = getPath2DByStatement(registry, statement)
		var originalPoints = Polyline.copy(points)
		points.length = 0
		for (var vertexIndex = 0; vertexIndex < path.length - 1; vertexIndex++) {
			var beginPoint = path[vertexIndex]
			var beginEnd = Vector.normalize2D(VectorFast.getSubtraction2D(path[vertexIndex + 1], beginPoint))
			var additionPoints = Polyline.getRotation2DVector(originalPoints, beginEnd)
			Polyline.add2D(additionPoints, beginPoint)
			if (points.length > 0) {
				if (VectorFast.distanceSquaredArray(points[points.length - 1], additionPoints[0], 3) < gCloseSquared) {
					additionPoints.splice(0, 1)
				}
			}
			Vector.pushArray(points, additionPoints)
		}
		return points
	},
	tag: 'polylineJoin',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
			return
		}

		var points = getPointsHD(registry, statement)
		if (points == undefined) {
			printCaller(['No work mesh or points could be found for polylineJoin in alteration.', statement])
			return
		}

		statement.tag = getValueByKeyDefault('tag', registry, statement, this.tag, 'polyline')
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gReverse = {
	getPoints: function(points, registry, statement) {
		return Polyline.copy(points).reverse()
	},
	tag: 'reverse',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
			return
		}

		var points = getPointsHD(registry, statement)

		if (points == undefined) {
			printCaller(['No points could be found for reverse in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gSplit = {
	addSplitPolygonsByStatement: function(polygons, registry, statement) {
		var splitPolygons = []
		addSplitPolygonsByHeights(polygons, this.splitHeights, splitPolygons)
		addPolygonsToGroup(splitPolygons, registry, statement)
	},
	alterMesh: function(mesh, registry, statement) {
		var antiregion = getMeshRegion('antiregion', registry, statement)
		var id = statement.attributeMap.get('id')
		var matrix3D = getChainMatrix3D(registry, statement)
		var region = getMeshRegion('region', registry, statement)
		var splitHeights = getFloatsByStatement('splitHeight', registry, statement)
		splitMesh(antiregion, id, matrix3D, mesh, region, registry, splitHeights, statement)
	},
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		this.splitHeights = getFloatsByStatement('splitHeight', registry, statement)
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				var polygons = getChainPointListsHDRecursivelyDelete(registry, workStatement, 'polygon')
				if (polygons.length == 0) {
					printCaller(['No polygons could be found for a workStatement in split in alteration.', workStatement, statement])
				}
				else {
					this.addSplitPolygonsByStatement(polygons, registry, statement)
				}
			}
			setPointsExcept([], registry, statement)
			return
		}

		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (Vector.isEmpty(polygons)) {
			printCaller(['No work mesh or polygons could be found for split in alteration.', statement])
			return
		}

		this.addSplitPolygonsByStatement(polygons, registry, statement)
		setPointsExcept([], registry, statement)
	},
	tag: 'split'
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
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		printCaller(['No work mesh could be found for taper in alteration.', statement])
	}
}

var gThread = {
	alterMesh: function(mesh, registry, statement) {
		var axials = getPointsByKey('axial', registry, statement)
		var center = getFloatsByDefault('center', registry, statement, this.tag, [0.0, 0.0])
		var matrix3D = getChainMatrix3D(registry, statement)
		var isOutside = getBooleanByDefault('outside', registry, statement, this.name, true)
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
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		printCaller(['No work mesh could be found for thread in alteration.', statement])
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
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (Vector.isEmpty(polygons)) {
			printCaller(['No work mesh or polygons could be found for triangulate in alteration.', statement])
			return
		}

		var triangulatedPolygons = get3DTriangulatedPolygons(polygons)
		if (Vector.isEmpty(triangulatedPolygons)) {
			printCaller(['No triangulatedPolygons could be found for triangulate in alteration.', statement])
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
		if (Vector.isEmpty(verticalBound)) {
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
			Polyline.addByIndex(points, verticalBound[1] - boundingBox[1][1], 1)
			return points
		}

		if (verticalBound[1] == undefined) {
			Polyline.addByIndex(points, verticalBound[0] - boundingBox[0][1], 1)
			return points
		}

		var boundingBoxHeight = boundingBox[1][1] - boundingBox[0][1]
		if (boundingBoxHeight == 0.0) {
			return points
		}

		var center = VectorFast.multiply2DScalar(VectorFast.getAddition2D(boundingBox[0], boundingBox[1]), 0.5)
		subtract2Ds(points, center)
		Polyline.multiply2DsScalar(points, (verticalBound[1] - verticalBound[0]) / boundingBoxHeight)
		Polyline.add2D(points, center)
		Polyline.addByIndex(points, (verticalBound[0] + verticalBound[1] - boundingBox[0][1] - boundingBox[1][1]) * 0.5, 1)
		return points
	},
	tag: 'verticalBound',
	processStatement:function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			alterProcessorPoints(this, registry, statement, workStatements)
		}
	}
}

var gWedge = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var inset = getPoint2DByDefault('inset', registry, statement, this.tag, [1.0, 1.0])
		var matrix3D = getChainMatrix3D(registry, statement)
		wedgeMesh(inset, matrix3D, mesh)
	},
	tag: 'wedge',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			alterProcessorMesh(this, registry, statement, workMeshes)
			return
		}

		var polygons = getPolygonsHDRecursively(registry, statement)
		if (Vector.isEmpty(polygons)) {
			printCaller(['No work mesh or polygons could be found for wedge in alteration.', statement])
			return
		}

		var heights = getHeights(registry, statement, this.tag)
		var matrix3D = getChainMatrix3D(registry, statement)
		var pillarMesh = extrusion.getMesh(heights, matrix3D, polygons)
		this.alterMesh(pillarMesh, registry, statement)
		analyzeOutputMesh(pillarMesh, registry, statement)
	}
}

var gAlterationProcessors = [
gBend, gBevel, gExpand, gFillet, gMirror, gMirrorJoin, gMove, gMultiplyJoin,
gOutset, gPlacer, gPolygonate, gPolygonJoin, gPolylineJoin, gReverse, roundProcessor, gSplit, gTaper, gThread, transform3DProcessor,
gTriangulate, gVerticalBound, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
