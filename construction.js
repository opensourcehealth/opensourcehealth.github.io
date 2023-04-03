//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetByWorkMap(facets, key, nextIndex, workMap) {
	var facet = []
	var startKey = key
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		facet.push(key)
		if (nextIndex == null || nextIndex == startKey) {
			if (facet.length > 2) {
				facets.push(facet)
			}
			return
		}
		key = nextIndex
		nextIndex = null
		if (workMap.has(key)) {
			nextIndex = workMap.get(key)
			workMap.set(key, null)
		}
	}
}

function addFacetsByWorkMap(facets, workMap) {
	for (var key of workMap.keys()) {
		var nextIndex = workMap.get(key)
		if (nextIndex != null) {
			workMap.set(key, null)
			addFacetByWorkMap(facets, key, nextIndex, workMap)
		}
	}
}

function addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh) {
	var loneArrowSet = getLoneArrowSet(facets)
	removeCollectionElementsByIterable(loneArrowSet, originalLoneArrowSet)
	var pointSet = new Set()
	for (var arrow of loneArrowSet) {
		pointSet.add(arrow.split(' ')[0])
	}
	if (pointSet.size > 0) {
		if (workMesh.intersectionIndexesMap == undefined) {
			workMesh.intersectionIndexesMap = new Map()
		}
		addElementsToMapArray(Array.from(pointSet), id, workMesh.intersectionIndexesMap)
	}
}

function addSeparatedFacets(facet, mesh) {
	var arrowMap = new Map()
	var points = mesh.points
	var skipSet = new Set()
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var reverseStrings = [facet[(vertexIndex + 1) % facet.length], facet[vertexIndex]]
		var reverseKey = reverseStrings.toString()
		if (arrowMap.has(reverseKey)) {
			var otherIndex = arrowMap.get(reverseKey)
			var midpoint = getMidpoint2D(points[facet[vertexIndex]], points[facet[otherIndex]])
			var facetSlice = getPolygonSlice(facet, (vertexIndex + 1) % facet.length, arrowMap.get(reverseKey))
			var xIntersections = []
			var y = midpoint[1]
			addXIntersectionsByPolygon(xIntersections, getPolygonByFacet(facetSlice, points), y)
			facetSlice = getPolygonSlice(facet, (arrowMap.get(reverseKey) + 1) % facet.length, vertexIndex)
			addXIntersectionsByPolygon(xIntersections, getPolygonByFacet(facetSlice, points), y)
			if (getNumberOfIntersectionsToLeft(midpoint[0], xIntersections) % 2 == 0) {
				skipSet.add(vertexIndex)
				skipSet.add(otherIndex)
			}
		}
		else {
			reverseStrings.reverse()
			arrowMap.set(reverseStrings.toString(), vertexIndex)
		}
	}
	if (skipSet.size == 0) {
		return
	}
	var polylines = getPolylinesByFacet(facet, skipSet)
	var endMap = getEndMapByPolylines(polylines)
	var separatedFacetIndex = 0
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polyline = polylines[polylineIndex]
		endPolylineIndex = endMap.get(polyline[polyline.length - 1])
		polyline.pop()
		if (endPolylineIndex == polylineIndex) {
			if (polyline.length > 2) {
				if (separatedFacetIndex == 0) {
					overwriteArray(facet, polyline)
				}
				else {
					mesh.facets.push(polyline)
				}
				separatedFacetIndex++
			}
			endMap.delete(polyline[0])
		}
		else {
			pushArray(polyline, polylines[endPolylineIndex])
			polylines[endPolylineIndex] = polyline
			endMap.set(polyline[0], endPolylineIndex)
		}
	}
}

function addSeparatedFacetsByStart(facetIndexStart, facetIntersections, mesh) {
	var facetsLength = mesh.facets.length
	for (var facetIndex = facetIndexStart; facetIndex < facetsLength; facetIndex++) {
		if (Math.abs(getNormalByFacet(mesh.facets[facetIndex], mesh.points)[2]) > gClose) {
			addSeparatedFacets(mesh.facets[facetIndex], mesh)
		}
	}
	for (var facetIntersection of facetIntersections) {
		if (!facetIntersection.isVertical) {
			addSeparatedFacets(mesh.facets[facetIntersection.facetIndex], mesh)
		}
	}
}

function addToToolWorkMap(facetIntersections, inversePoints, outerZ, pointIndex, pointToolIndexMap, toolMeshPoints) {
	if (pointToolIndexMap.has(pointIndex)) {
		return
	}
	var toolPoint = toolMeshPoints[pointIndex].slice(0)
	toolPoint[2] += outerZ
	for (var facetIntersection of facetIntersections) {
		for (var workPointIndex of facetIntersection.facet) {
			if (distanceSquared2D(toolPoint, inversePoints[workPointIndex]) < gCloseSquared) {
				pointToolIndexMap.set(pointIndex, workPointIndex)
				return
			}
		}
	}
}

function addVerticalFacets(facetIntersections, isClockwiseTop, toolPolygon, workMesh) {
	var facets = workMesh.facets
	var workFacets = []
	addFacetsByWorkMap(workFacets, getDifferenceWorkMap(facets))
	var polylines = []
	var toolPairMap = getToolPairMap(facetIntersections, isClockwiseTop, workMesh.points, toolPolygon)
	for (var workFacet of workFacets) {
		var startIndex = null
		for (var vertexIndex = 0; vertexIndex < workFacet.length; vertexIndex++) {
			if (toolPairMap.has(workFacet[vertexIndex])) {
				startIndex = vertexIndex
				break
			}
		}
		if (startIndex == null) {
			facets.push(workFacet)
		}
		else {
			var polyline = null
			for (var extraIndex = 0; extraIndex < workFacet.length; extraIndex++) {
				var vertexIndex = (startIndex + extraIndex) % workFacet.length
				var beginIndex = workFacet[vertexIndex]
				var nextIndex = workFacet[(vertexIndex + 1) % workFacet.length]
				if (polyline == null) {
					polyline = [beginIndex, nextIndex]
				}
				else {
					if (toolPairMap.has(workFacet[vertexIndex])) {
						polylines.push(polyline)
						polyline = [beginIndex, nextIndex]
					}
					else {
						polyline.push(nextIndex)
					}
				}
			}
			if (!getIsEmpty(polyline)) {
				polylines.push(polyline)
			}
		}
	}
	var endMap = getEndMapByPolylines(polylines)
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polyline = polylines[polylineIndex]
		var beginKey = polyline[polyline.length - 1]
		var endPolylineIndex = null
		if (toolPairMap.has(beginKey)) {
			var pairKey = toolPairMap.get(beginKey)
			if (endMap.has(pairKey)) {
				endPolylineIndex = endMap.get(pairKey)
			}
		}
		if (endPolylineIndex != null) {
			polylines[polylineIndex] = null
			if (endPolylineIndex == polylineIndex) {
				if (polyline[0] == polyline[polyline.length - 1]) {
					polyline.pop()
				}
				if (polyline.length > 2) {
					facets.push(polyline)
				}
				endMap.delete(polyline[0])
			}
			else {
				pushArray(polyline, polylines[endPolylineIndex])
				polylines[endPolylineIndex] = polyline
				endMap.set(polyline[0], endPolylineIndex)
			}
		}
	}
	for (var polyline of polylines) {
		if (polyline != null) {
			noticeByList(['polyline is not null in addVerticalFacets in construction.', polyline, polylines])
			if (polyline[0] == polyline[polyline.length - 1]) {
				polyline.pop()
			}
			if (polyline.length > 2) {
				facets.push(polyline)
			}
		}
	}
}

function differenceByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				differenceByPolygon(id, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function differenceByPolygon(id, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	var facets = workMesh.facets
	addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
	var toolDirected = getDirectedPolygon(false, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, true)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var originalLoneArrowSet = getLoneArrowSet(facets)
	var facetIndexStart = facets.length
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gDifferenceExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	addSeparatedFacetsByStart(facetIndexStart, facetIntersections, workMesh)
	addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh)
	facetIndexStart = facets.length
	addVerticalFacets(facetIntersections, true, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = facets.slice(facetIndexStart, facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	removeShortArrays(facets, 3)
}

function embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh) {
	var outset = gClose
	if (isTop) {
		outset = -outset
	}
	var toolFacets = getArraysCopy(toolMesh.facets)
	var toolPoints = getArraysCopy(toolMesh.points)
	var xyFacetIndexes = []
	for (var xyFacetIndex = 0; xyFacetIndex < toolFacets.length; xyFacetIndex++) {
		var xyFacet = toolFacets[xyFacetIndex]
		var isZZero = true
		for (var pointIndex of xyFacet) {
			if (Math.abs(toolPoints[pointIndex][2]) > gClose) {
				isZZero = false
				break
			}
		}
		if (isZZero) {
			xyFacetIndexes.push(xyFacetIndex)
		}
	}
	if (xyFacetIndexes.length == 0) {
		xyFacetIndexes.push(0)
	}
	var toolDirecteds = getPolygonsByFacetIndexes(xyFacetIndexes, toolFacets, toolPoints)
	if (getIsClockwise(toolDirecteds[0]) != isTop) {
		reverseArrays(toolFacets)
		for (var toolDirected of toolDirecteds) {
			toolDirected.reverse()
		}
	}
	var insetToolDirected = getOutsetPolygonByMarker(null, null, true, [[outset, outset]], toolDirecteds[0], null)
	for (var strata of stratas) {
		embossMeshByStrata(
		insetToolDirected, inversePoints, isTop, strata, toolDirecteds, {facets:toolFacets, points:toolPoints}, xyFacetIndexes, workMesh)
	}
}

function embossMeshByStrata(insetToolDirected, inversePoints, isTop, strata, toolDirecteds, toolMesh, xyFacetIndexes, workMesh) {
	var facets = workMesh.facets
	addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
	var allFacetIntersections = getFacetIntersections(strata, toolDirecteds[0], workMesh)
	var closeFacetIntersections = []
	var facetIntersections = []
	for (var facetIntersection of allFacetIntersections) {
		if (facetIntersection.isClockwise != isTop || facetIntersection.isVertical) {
			var isIntersection = !facetIntersection.isVertical
			if (isIntersection) {
				isIntersection = getIsPolygonIntersecting(insetToolDirected, facetIntersection.workPolygon)
			}
			if (isIntersection) {
				facetIntersections.push(facetIntersection)
			}
			else {
				closeFacetIntersections.push(facetIntersection)
			}
		}
	}
	var facetIntersectionsMap = new Map()
	var linkMap = new Map()
	for (var facetIntersectionIndex = 0; facetIntersectionIndex < facetIntersections.length; facetIntersectionIndex++) {
		var facet = facetIntersections[facetIntersectionIndex].facet
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var vertex = facet[vertexIndex]
			var nextVertex = facet[(vertexIndex + 1) % facet.length]
			addElementToMapArray(facetIntersectionIndex, getEdgeKey(vertex.toString(), nextVertex.toString()), facetIntersectionsMap)
		}
	}
	addFirstTwoKeysToLinkMap(facetIntersectionsMap, linkMap)
	var joinedMap = getJoinedMap(facetIntersections.length, linkMap)
	for (var joined of joinedMap.values()) {
		var arrowSet = new Set()
		var joinedFacetIntersections = new Array(joined.length)
		for (var joinedIndex = 0; joinedIndex < joined.length; joinedIndex++) {
			var facetIntersection = facetIntersections[joined[joinedIndex]]
			joinedFacetIntersections[joinedIndex] = facetIntersection
			var facet = facetIntersection.facet
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				arrowSet.add(facet[(vertexIndex + 1) % facet.length] + ' ' + facet[vertexIndex])
			}
		}
		var joinedCloseIntersections = []
		for (var closeFacetIntersection of closeFacetIntersections) {
			if (facetSharesArrow(closeFacetIntersection.facet, arrowSet)) {
				joinedCloseIntersections.push(closeFacetIntersection)
			}
		}
		var facetIndexStart = facets.length
		var toolWorkMap = new Map()
		for (var toolDirectedIndex = 0; toolDirectedIndex < toolDirecteds.length; toolDirectedIndex++) {
			var xyFacet = toolMesh.facets[xyFacetIndexes[toolDirectedIndex]]
			embossMeshByIntersections(
			joinedCloseIntersections, joinedFacetIntersections, strata, toolDirecteds[toolDirectedIndex], toolWorkMap, xyFacet, workMesh)
			for (var joinedFacetIntersection of joinedFacetIntersections) {
				joinedFacetIntersection.alongIndexesMap = null
				joinedFacetIntersection.facet = facets[joinedFacetIntersection.facetIndex]
				joinedFacetIntersection.workPolygon = getPolygonByFacet(joinedFacetIntersection.facet, workMesh.points)
				joinedFacetIntersection.toolMeshIndexMap = new Map()
			}
		}
		addSeparatedFacetsByStart(facetIndexStart, joinedFacetIntersections, workMesh)
		embossMeshByToolWorkMap(joinedFacetIntersections, inversePoints, getMeshCopy(toolMesh), toolWorkMap, xyFacetIndexes, workMesh)
	}
}

function embossMeshByIntersections(closeFacetIntersections, facetIntersections, strata, toolDirected, toolWorkMap, xyFacet, workMesh) {
	var facets = workMesh.facets
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var arrowAlongMap = new Map()
	for (var facetIntersection of facetIntersections) {
		var alongIndexesMap = facetIntersection.alongIndexesMap
		for (var nodeKey of alongIndexesMap.keys()) {
			var nodeStrings = nodeKey.split(' ')
			if (nodeStrings[0] == 'w') {
				var facet = facets[facetIntersection.facetIndex]
				var beginIndex = parseInt(nodeStrings[1])
				var endIndex = (beginIndex + 1) % facet.length
				arrowAlongMap.set(facet[endIndex].toString() + ' ' + facet[beginIndex], alongIndexesMap.get(nodeKey))
			}
		}
	}
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gDifferenceExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	for (var closeFacetIntersection of closeFacetIntersections) {
		addMeetingsToFacet(arrowAlongMap, facets[closeFacetIntersection.facetIndex], meetingMap)
	}
	var facetVertexIndexes = getFacetVertexIndexes(toolDirected)
	for (var toolVertexIndex = 0; toolVertexIndex < toolDirected.length; toolVertexIndex++) {
		for (var facetIntersection of facetIntersections) {
			var vertexIndex = facetVertexIndexes.vertexIndexes[facetVertexIndexes.facet[toolVertexIndex]]
			if (facetIntersection.toolMeshIndexMap.has(vertexIndex)) {
				toolWorkMap.set(xyFacet[toolVertexIndex], facetIntersection.toolMeshIndexMap.get(vertexIndex))
				break
			}
		}
	}
}

function embossMeshByToolWorkMap(facetIntersections, inversePoints, toolMesh, toolWorkMap, xyFacetIndexes, workMesh) {
	var borderSet = new Set()
	var facets = workMesh.facets
	var toolFacets = toolMesh.facets
	var toolPoints = toolMesh.points
	var workMap = getDifferenceWorkMap(facets)
	var xySet = new Set()
	for (var xyFacetIndex of xyFacetIndexes) {
		addElementsToSet(xySet, toolFacets[xyFacetIndex])
	}
	for (var toolFacet of toolFacets) {
		for (var vertexIndex = 0; vertexIndex < toolFacet.length; vertexIndex++) {
			var pointIndex = toolFacet[vertexIndex]
			if (!xySet.has(pointIndex)) {
				var previousPointIndex = toolFacet[(vertexIndex - 1 + toolFacet.length) % toolFacet.length]
				var nextPointIndex = toolFacet[(vertexIndex + 1) % toolFacet.length]
				if (xySet.has(previousPointIndex) || xySet.has(nextPointIndex)) {
					borderSet.add(pointIndex)
				}
			}
		}
	}
	var averageBorderHeight = 0.0
	for (var pointIndex of borderSet) {
		averageBorderHeight += toolPoints[pointIndex][2]
	}
	var isConnectionAboveXY = averageBorderHeight > 0.0
	var outerZ = null
	for (var pointIndex of toolWorkMap.values()) {
		var inversePointZ = inversePoints[pointIndex][2]
		if (outerZ == null) {
			outerZ = inversePointZ
		}
		else {
			if (isConnectionAboveXY) {
				outerZ = Math.max(outerZ, inversePointZ)
			}
			else {
				outerZ = Math.min(outerZ, inversePointZ)
			}
		}
	}
	for (var xyFacetIndex of xyFacetIndexes) {
		for (var pointIndex of toolFacets[xyFacetIndex]) {
			addToToolWorkMap(facetIntersections, inversePoints, outerZ, pointIndex, toolWorkMap, toolPoints)
		}
	}
	for (var toolFacet of toolFacets) {
		for (var vertexIndex = 0; vertexIndex < toolFacet.length; vertexIndex++) {
			var pointIndex = toolFacet[vertexIndex]
			if (!toolWorkMap.has(pointIndex)) {
				toolWorkMap.set(pointIndex, inversePoints.length)
				var toolPoint = toolPoints[pointIndex]
				toolPoint[2] += outerZ
				inversePoints.push(toolPoint)
			}
			toolFacet[vertexIndex] = toolWorkMap.get(pointIndex)
		}
	}
	var xyFacetIndexSet = new Set(xyFacetIndexes)
	for (var toolFacetIndex = 0; toolFacetIndex < toolFacets.length; toolFacetIndex++) {
		var toolFacet = toolFacets[toolFacetIndex]
		if (!xyFacetIndexSet.has(toolFacetIndex)) {
			facets.push(getFacetByWorkMap(toolFacet, workMap))
		}
	}
	removeShortArrays(facets, 3)
}

function embossMeshesByTransform2Ds(matrix2Ds, matrix3D, isTop, stratas, toolMeshes, workMesh) {
	if (getIsEmpty(toolMeshes)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolMesh of toolMeshes) {
		if (getIsEmpty(matrix2Ds)) {
			embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
		}
		else {
			var toolPoints = getArraysCopy(toolMesh.points)
			for (var matrix2D of matrix2Ds) {
				overwriteArraysUntil(toolMesh.points, toolPoints, 2)
				transform2DPoints(matrix2D, toolMesh.points)
				embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
			}
			overwriteArraysUntil(toolMesh.points, toolPoints, 2)
		}
	}
	pushArray(originalPoints, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	workMesh.points = originalPoints
	removeUnfacetedPoints(workMesh)
}

function getAssembledMesh(centerScale, meshes) {
	if (meshes.length == 0) {
		return {facets:[], points:[]}
	}
	var assembledMesh = getMeshCopy(meshes[0])
	if (!getIsEmpty(centerScale)) {
		if (centerScale.length < 2) {
			centerScale.push(centerScale[0])
		}
		if (centerScale.length < 3) {
			centerScale.push(centerScale[1])
		}
	}
	for (var meshIndex = 1; meshIndex < meshes.length; meshIndex++) {
		var meshCopy = getMeshCopy(meshes[meshIndex])
		if (!getIsEmpty(centerScale)) {
			var meshBoundingBox = getMeshBoundingBox(meshCopy)
			var center = multiply3DScalar(getAddition3D(meshBoundingBox[0], meshBoundingBox[1]), 0.5)
			add3Ds(meshCopy.points, getMultiplication3DScalar(center, -1.0))
			multiply3Ds(meshCopy.points, centerScale)
			add3Ds(meshCopy.points, center)
		}
		addMeshToAssembledMesh(assembledMesh, meshCopy)
	}
	return assembledMesh
}

function getDifferenceWorkMap(facets) {
	return getWorkMapByArrowSet(getLoneArrowSet(facets))
}

function getFacetIntersections(strata, toolPolygon, workMesh) {
	var facetIntersections = []
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		var facet = workMesh.facets[facetIndex]
		if (getIsFacetInStrata(facet, workMesh.points, strata)) {
			var workPolygon = getPolygonByFacet(facet, workMesh.points)
			if (getIsPolygonIntersectingOrClose(toolPolygon, workPolygon)) {
				var facetIntersection = {
					facet:facet,
					facetIndex:facetIndex,
					isClockwise:true,
					isVertical:Math.abs(getNormalByPolygon(workPolygon)[2]) < gClose,
					isToolReversed:false,
					toolMeshIndexMap:new Map(),
					workPolygon:workPolygon
				}
				if (!facetIntersection.isVertical) {
					facetIntersection.isClockwise = getIsClockwise(workPolygon)
				}
				facetIntersections.push(facetIntersection)
			}
		}
	}
	return facetIntersections
}

function getMeshesByChildren(children, registry) {
	var meshes = []
	for (var child of children) {
		var mesh = getMeshByID(child.attributeMap.get('id'), registry)
		if (mesh != null) {
			meshes.push(mesh)
		}
	}
	return meshes
}

function getMeshesByKey(key, registry, statement) {
	var ids = getStrings(key, statement)
	var meshes = []
	for (var id of ids) {
		if (registry.idMap.has(id)) {
			addMeshesRecursively(0, meshes, registry, registry.idMap.get(id))
		}
	}
	return meshes
}

function getOverlappedPolygons(outset, polygons) {
	if (polygons.length < 2) {
		return polygons
	}
	var overlappedPolygons = [polygons[0]]
	var outsetPolygons = [getOutsetPolygon(outset, polygons[0])]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		pushArray(overlappedPolygons, getDifferencePolygonsByPolygons(outsetPolygons, [polygons[polygonIndex]]))
		outsetPolygons.push(getOutsetPolygon(outset, polygons[polygonIndex]))
	}
	return overlappedPolygons
}

function getSplitHeightsByInsides(facets, splitHeights, splitInsides, workMesh) {
	var bottom = null
	var top = null
	for (var facet of facets) {
		for (var pointIndex of facet) {
			var pointZ = workMesh.points[pointIndex][2]
			if (bottom == null) {
				bottom = pointZ
				top = pointZ
			}
			else {
				bottom = Math.min(bottom, pointZ)
				top = Math.max(top, pointZ)
			}
		}
	}
	if (bottom == null) {
		return splitHeights
	}
	for (var splitInside of splitInsides) {
		var bottomPlus = bottom + splitInside
		var topMinus = top - splitInside
		if (Math.abs(bottomPlus - topMinus) < gClose) {
			splitHeights = getPushArray(splitHeights, [bottomPlus])
		}
		else {
			splitHeights = getPushArray(splitHeights, [bottomPlus, topMinus])
		}
	}
	return splitHeights
}

function getStratas(registry, statement) {
	var stratas = getFloatListsByStatement('stratas', registry, statement)
	if (getIsEmpty(stratas)) {
		return [null]
	}
	return stratas
}

function getToolPairMap(facetIntersections, isClockwiseTop, points, toolPolygon, topGreaterThan) {
	var bottomMap = new Map()
	var toolPairMap = new Map()
	var topMap = new Map()
	for (var toolVertexIndex = 0; toolVertexIndex < toolPolygon.length; toolVertexIndex++) {
		for (var facetIntersection of facetIntersections) {
			if (!facetIntersection.isVertical) {
				if (facetIntersection.toolMeshIndexMap.has(toolVertexIndex)) {
					var pointIndex = facetIntersection.toolMeshIndexMap.get(toolVertexIndex)
					var zIndex = [points[pointIndex][2], pointIndex]
					if (facetIntersection.isClockwise == isClockwiseTop) {
						addElementToMapArray(zIndex, toolVertexIndex, bottomMap)
					}
					else {
						addElementToMapArray(zIndex, toolVertexIndex, topMap)
					}
				}
			}
		}
	}
	for (var toolVertexIndex = 0; toolVertexIndex < toolPolygon.length; toolVertexIndex++) {
		if (bottomMap.has(toolVertexIndex) && topMap.has(toolVertexIndex)) {
			var bottomZIndexes = bottomMap.get(toolVertexIndex)
			var topZIndexes = topMap.get(toolVertexIndex)
			bottomZIndexes.sort(compareFirstElementAscending)
			topZIndexes.sort(compareFirstElementAscending)
			for (var bottomZIndex of bottomZIndexes) {
				for (var topZIndexIndex = 0; topZIndexIndex < topZIndexes.length; topZIndexIndex++) {
					var topZIndex = topZIndexes[topZIndexIndex]
					if (topZIndex != null) {
						if (topZIndex[0] > bottomZIndex[0]) {
							toolPairMap.set(bottomZIndex[1], topZIndex[1])
							toolPairMap.set(topZIndex[1], bottomZIndex[1])
							topZIndexes[topZIndexIndex] = null
							break
						}
					}
				}
			}
		}
	}
	return toolPairMap
}

function getWorkMapByArrowSet(arrowSet) {
	var workMap = new Map()
	for (var arrow of arrowSet) {
		var splitKey = arrow.split(' ')
		workMap.set(parseInt(splitKey[1]), parseInt(splitKey[0]))
	}
	return workMap
}

function getWorkPolygons(registry, statement) {
	var workStatement = getWorkStatement(registry, statement)
	if (workStatement == null) {
		return []
	}
	var workPolygons = getPolygonsHDRecursively(registry, workStatement)
	removeShortArrays(workPolygons, 3)
	return workPolygons
}

function intersectionByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	var intersectionFacets = []
	var originalFacets = getArraysCopy(workMesh.facets)
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				intersectionByPolygon(
				id, intersectionFacets, originalFacets, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.facets = intersectionFacets
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function intersectionByPolygon(id, intersectionFacets, originalFacets, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	workMesh.facets = getArraysCopy(originalFacets)
	addFacetsByWorkMap(workMesh.facets, getDifferenceWorkMap(workMesh.facets))
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, true)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gIntersectionExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	var facetIndexSet = new Set()
	for (var facetIntersection of facetIntersections) {
		facetIndexSet.add(facetIntersection.facetIndex)
	}
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			workMesh.facets[facetIndex] = []
		}
	}
	var facetIndexStart = workMesh.facets.length
	addVerticalFacets(facetIntersections, true, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = workMesh.facets.slice(facetIndexStart, workMesh.facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	for (var facet of workMesh.facets) {
		if (getIsLong(facet, 3)) {
			intersectionFacets.push(facet)
		}
	}
	removeShortArrays(workMesh.facets, 3)
}

function unionByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				unionByPolygon(id, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function unionByPolygon(id, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	var facets = workMesh.facets
	addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, false)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var originalLoneArrowSet = getLoneArrowSet(facets)
	var facetIndexStart = facets.length
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gUnionExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	addSeparatedFacetsByStart(facetIndexStart, facetIntersections, workMesh)
	addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh)
	var facetIndexStart = facets.length
	addVerticalFacets(facetIntersections, false, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = facets.slice(facetIndexStart, facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	removeShortArrays(facets, 3)
}

var gAssembly = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'assembly',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var meshes = getMeshesRecursively(registry, statement)
		if (getIsEmpty(meshes)) {
			noticeByList(['No meshes could be found for assembly in construction.', statement])
			return
		}
		var centerScale = getFloatsByStatement('centerScale', registry, statement)
		analyzeOutputMesh(getAssembledMesh(centerScale, meshes), registry, statement)
	}
}

var gDifference = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'difference',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No tool polygons could be found for difference in construction.', statement])
			return
		}
		if (!statement.attributeMap.get('work')) {
			noticeByList(['No work could be found for difference in construction.', statement])
			return
		}
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			differenceByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var workPolygons = getWorkPolygons(registry, statement)
		if (workPolygons.length == 0) {
			noticeByList(['No work polygon or mesh could be found for difference in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var workPolygons = getDifferencePolygonsByPolygons(polygons, workPolygons)
		if (getIsEmpty(workPolygons)) {
			noticeByList(['No polygons remained after difference operation in construction.', polygons, workPolygon, statement])
			return
		}
		addPolygonsToGroup(workPolygons, registry, statement)
	}
}

var gEmboss = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'emboss',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var isTop = getBooleanByDefault(true, 'top', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var stratas = getStratas(registry, statement)
		var bottomTools = getMeshesByKey('bottomTools', registry, statement)
		pushArray(bottomTools, getMeshesByKey('bottomTool', registry, statement))
		var topTools = getMeshesByKey('topTools', registry, statement)
		pushArray(topTools, getMeshesByKey('topTool', registry, statement))
		var tools = getMeshesByChildren(statement.children, registry)
		pushArray(tools, getMeshesByKey('tools', registry, statement))
		if (isTop) {
			pushArray(topTools, tools)
		}
		else {
			pushArray(bottomTools, tools)
		}
		if (bottomTools.length == 0 && topTools.length == 0) {
			noticeByList(['No toolMeshes could be found for emboss in construction.', statement])
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, false, stratas, bottomTools, workMesh)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, true, stratas, topTools, workMesh)
//		console.log(getDifferenceWorkMap(workMesh.facets))
	addFacetsByWorkMap(workMesh.facets, getDifferenceWorkMap(workMesh.facets))
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gIntersection = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'intersection',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			if (getIsEmpty(polygons)) {
				noticeByList(['No tool polygons could be found for intersection in construction.', statement])
				return
			}
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			intersectionByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for intersection in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var intersectedPolygons = getIntersectionPolygonsByPolygons(polygons)
		if (getIsEmpty(intersectedPolygons)) {
			noticeByList(['No polygons remained after intersection operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(intersectedPolygons, registry, statement)
	}
}

var gJoin = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'join',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (getIsEmpty(workMeshes)) {
			noticeByList(['No work meshes could be found for join in construction.', statement])
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		var matrix3D = getChainMatrix3D(registry, statement)
		joinMeshes(matrix2Ds, matrix3D, workMeshes)
		analyzeOutputMesh(getMeshCopy(workMeshes[0]), registry, statement)
	}
}

var gOverlap = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'overlap',
	processStatement: function(registry, statement) {
		convertToGroup(statement)
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for overlap in construction.', statement])
			return
		}
		var outset = getPointByDefault([1.0, 1.0], 'outset', registry, statement, this.name)
		var overlappedPolygons = getOverlappedPolygons(outset, polygons)
		if (overlappedPolygons.length == 0) {
			noticeByList(['No polygons remained after overlap operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(overlappedPolygons, registry, statement)
	}
}

var gUnion = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'union',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			if (getIsEmpty(polygons)) {
				noticeByList(['No tool polygons could be found for union in construction.', statement])
				return
			}
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			unionByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for union in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var joinedPolygons = getUnionPolygonsByPolygons(polygons)
		if (joinedPolygons.length == 0) {
			noticeByList(['No polygons remained after union operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(joinedPolygons, registry, statement)
	}
}

var gConstructionProcessors = [gAssembly, gDifference, gEmboss, gIntersection, gJoin, gOverlap, gUnion]
