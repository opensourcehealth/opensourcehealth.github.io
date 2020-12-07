//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStart, points, polygon3D) {
	for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
		var bottomLeftIndex = pointIndexStart + vertexIndex
		var bottomRightIndex = pointIndexStart + (vertexIndex + 1) % polygon3D.length
		var topLeftIndex = bottomLeftIndex + polygon3D.length
		var topRightIndex = bottomRightIndex + polygon3D.length
		var polygonFacet = [pointIndexes[bottomLeftIndex]]
		addToFacet(polygonFacet, pointIndexes[topLeftIndex])
		addToFacet(polygonFacet, pointIndexes[topRightIndex])
		var bottomRightPointIndex = pointIndexes[bottomRightIndex]
		if (polygonFacet[0] != bottomRightPointIndex) {
			addToFacet(polygonFacet, bottomRightPointIndex)
		}
		addToFacets(arrowIndexSetMap, facets, points, polygonFacet)
	}
}

function addXIntersectionsByPolygon(xIntersections, xyPolygon, y) {
	for (var pointIndex = 0; pointIndex < xyPolygon.length; pointIndex++) {
		var point = xyPolygon[pointIndex]
		var pointNext = xyPolygon[(pointIndex + 1) % xyPolygon.length]
		if ((point[1] < y) != (pointNext[1] < y)) {
			deltaY = pointNext[1] - point[1]
			beginPortion = (pointNext[1] - y) / deltaY
			endPortion = 1.0 - beginPortion
			xIntersections.push(beginPortion * point[0] + endPortion * pointNext[0])
		}
	}
}

function addPolygon3DsToMesh(endFacets, facets, points, polygon3Ds) {
	var arrowIndexSetMap = new Map()
	var polygon3DLast = polygon3Ds.length - 1
	var pointIndexStarts = new Array(polygon3Ds.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3Ds.length; polygon3DIndex++) {
		pointIndexStarts[polygon3DIndex] = points.length
		pushArray(points, polygon3Ds[polygon3DIndex])
	}
	var pointIndexes = getPointIndexesPrunePoints(points)
	endFacets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[0], polygon3Ds[0])))
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DLast; polygon3DIndex++) {
		addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStarts[polygon3DIndex], points, polygon3Ds[polygon3DIndex])
	}
	endFacets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[polygon3DLast], polygon3Ds[polygon3DLast]).reverse()))
	for (var facet of facets) {
		var indexEntries = []
		for (var vertexIndexIndex = 0; vertexIndexIndex < facet.length; vertexIndexIndex++) {
			var vertexIndex = facet[vertexIndexIndex]
			var nextIndexIndex = (vertexIndexIndex + 1) % facet.length
			var nextIndex = facet[nextIndexIndex]
			var arrow = vertexIndex.toString() + ' ' + nextIndex.toString()
			if (arrowIndexSetMap.has(arrow)) {
				indexEntries.push([vertexIndexIndex, arrowIndexSetMap.get(arrow)])
			}
		}
		if (indexEntries.length > 0) {
			for (var entryIndex = indexEntries.length - 1; entryIndex > -1; entryIndex--) {
				var indexEntry = indexEntries[entryIndex]
				facet.splice(indexEntry[0] + 1, 0, indexEntry[1])
			}
		}
	}
}

function addToArrowsMap(arrowsMap, edges) {
	var arrow = {beginKey:edges[0], endKey:edges[1]}
	addArrayElementToMap(arrow, arrow.beginKey, arrowsMap)
	arrow = {beginKey:edges[1], endKey:edges[0]}
	addArrayElementToMap(arrow, arrow.beginKey, arrowsMap)
}

function addToFacet(polygonFacet, vertexIndex) {
	if (vertexIndex != polygonFacet[polygonFacet.length - 1]) {
		polygonFacet.push(vertexIndex)
	}
}

function addToFacets(arrowIndexSetMap, facets, points, polygonFacet) {
	if (polygonFacet.length < 3) {
		return
	}
	var concaveFacet = []
	const facetLengthMinus = polygonFacet.length - 1
	const facetLengthPlus = polygonFacet.length + 1
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		var previousPointIndex = polygonFacet[(vertexIndex + facetLengthMinus) % polygonFacet.length]
		var previousPoint = points[previousPointIndex]
		var pointIndex = polygonFacet[vertexIndex]
		var point = points[pointIndex]
		var nextPointIndex = polygonFacet[(vertexIndex + facetLengthPlus) % polygonFacet.length]
		var nextPoint = points[nextPointIndex]
		var vectorA = getXYZSubtraction(previousPoint, point)
		var vectorB = getXYZSubtraction(nextPoint, point)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		divideXYZByScalar(vectorA, vectorALength)
		divideXYZByScalar(vectorB, vectorBLength)
		if (getXYZDotProduct(vectorA, vectorB) > 0.9999999) {
			if (vectorALength > vectorBLength) {
				arrowIndexSetMap.set(pointIndex.toString() + ' ' + previousPointIndex.toString(), nextPointIndex)
			}
			else {
				arrowIndexSetMap.set(nextPointIndex.toString() + ' ' + pointIndex.toString(), previousPointIndex)
			}
		}
		else {
			concaveFacet.push(pointIndex)
		}
	}
	if (concaveFacet.length > 2) {
		facets.push(concaveFacet)
	}
}

function addToLinkMap(indexA, indexB, linkMap) {
	var greatestIndexA = getLinkHead(indexA, linkMap)
	var greatestIndexB = getLinkHead(indexB, linkMap)
	if (greatestIndexB > greatestIndexA) {
		linkMap.set(greatestIndexA, greatestIndexB)
	}
	else {
		if (greatestIndexA > greatestIndexB) {
			linkMap.set(greatestIndexB, greatestIndexA)
		}
	}
}

function addToPillarMesh(endFacets, facets, heights, points, polygon3D) {
	var polygon3Ds = new Array(heights.length)
	for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
		var height = heights[heightIndex]
		var polygon3DZ = new Array(polygon3D.length)
		for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
			var vertex = polygon3D[vertexIndex]
			polygon3DZ[vertexIndex] = [vertex[0], vertex[1], vertex[2] + height]
		}
		polygon3Ds[heightIndex] = polygon3DZ
	}
	addPolygon3DsToMesh(endFacets, facets, points, polygon3Ds)
}

function drillByMesh(drillMesh, heights, matrix, workMesh) {
	var drillFacet = null
	var drillFacetIndex = 0
	var drillFacets = getArraysCopy(drillMesh.facets)
	var drillPoints = getArraysCopy(drillMesh.points)
	var drillPolygon = null
	for (; drillFacetIndex < drillFacets.length; drillFacetIndex++) {
		drillFacet = drillFacets[drillFacetIndex]
		var polygon = getPolygonByFacet(drillFacet, drillPoints)
		var isZZero = true
		for (var point of polygon) {
			if (point[2] != 0.0) {
				isZZero = false
				break
			}
		}
		if (isZZero) {
			drillPolygon = polygon
			break
		}
	}
	if (drillPolygon == null) {
		warningByList(['In drillByMesh drillPolygon == null', drillMesh])
		return
	}
	var facets = workMesh.facets
	var points = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), points)
	var intersectingFacetIndexes = getIntersectingFacetIndexesByHeight(facets, heights, inversePoints, drillPolygon)
	if (intersectingFacetIndexes == null) {
		warningByList(['In drillByMesh intersectingFacetIndexes == null', heights])
		return
	}
	if (intersectingFacetIndexes.length < 1) {
		warningByList(['In drillByMesh intersectingFacetIndexes.length < 1', intersectingFacetIndexes])
		return
	}
	for (var intersectingFacetIndex of intersectingFacetIndexes) {
		var isDrillPolygonClockwise = getIsClockwise(drillPolygon)
		var intersectingFacet = facets[intersectingFacetIndex]
		var workPolygon = getPolygonByFacet(intersectingFacet, inversePoints)
		if (getIsClockwise(workPolygon) == isDrillPolygonClockwise) {
			var height = getZByPointPolygon(drillPolygon[0], workPolygon)
			for (var facetIndex = 0; facetIndex < drillFacets.length; facetIndex++) {
				facet = drillFacets[facetIndex]
				for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
					facet[vertexIndex] = facet[vertexIndex] + points.length
				}
				facet.reverse()
				if (facetIndex != drillFacetIndex) {
					facets.push(facet)
				}
			}
			for (var drillPoint of drillPoints) {
				drillPoint[2] += height
			}
			pushArray(inversePoints, drillPoints)
			facets[intersectingFacetIndex] = getConnectedFacet([intersectingFacet, drillFacet], inversePoints)
			pushArray(points, getXYZsBy3DMatrix(matrix, inversePoints.slice(points.length, inversePoints.length)))
		}
	}
}

function drillByPolygon(drillPolygon, heights, matrix, mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), points)
	var intersectingFacetIndexes = getIntersectingFacetIndexesByHeight(facets, heights, inversePoints, drillPolygon)
	if (intersectingFacetIndexes == null) {
		return
	}
	if (intersectingFacetIndexes.length < 2) {
		warningByList(['In drillByPolygon intersectingFacetIndexes.length < 2', intersectingFacetIndexes])
		return
	}
	var intersectingFacetIndexPairs = []
	for (var intersectingIndexIndex = 0; intersectingIndexIndex < intersectingFacetIndexes.length; intersectingIndexIndex++) {
		var nextIndexIndex = intersectingIndexIndex + 1
		if (nextIndexIndex < intersectingFacetIndexes.length) {
			var intersectingFacetIndex = intersectingFacetIndexes[intersectingIndexIndex]
			var nextIntersectingFacetIndex = intersectingFacetIndexes[nextIndexIndex]
			var isPolygonClockwise = getIsClockwise(getPolygonByFacet(facets[intersectingFacetIndex], inversePoints))
			var isNextPolygonClockwise = getIsClockwise(getPolygonByFacet(facets[nextIntersectingFacetIndex], inversePoints))
			if (isPolygonClockwise && !isNextPolygonClockwise) {
				intersectingFacetIndexPairs.push([intersectingFacetIndex, nextIntersectingFacetIndex])
				intersectingIndexIndex += 1
			}
		}
	}
	for (var intersectingFacetIndexes of intersectingFacetIndexPairs) {
		var drillFacets = new Array(2)
		var isDrillPolygonClockwise = getIsClockwise(drillPolygon)
		for (var drillFacetIndex = 0; drillFacetIndex < 2; drillFacetIndex++) {
			var intersectingFacetIndex = intersectingFacetIndexes[drillFacetIndex]
			var intersectingFacet = facets[intersectingFacetIndex]
			var polygon = getPolygonByFacet(intersectingFacet, inversePoints)
			var height = getZByPointPolygon(drillPolygon[0], polygon)
			var drillXYZPolygon = getXYZPolygon(drillPolygon, height)
			var drillFacet = new Array(drillXYZPolygon.length)
			var pointsLength = inversePoints.length
			for (var pointIndex = 0; pointIndex < drillPolygon.length; pointIndex++) {
				drillFacet[pointIndex] = pointsLength
				pointsLength += 1
			}
			pushArray(inversePoints, drillXYZPolygon)
			if (getIsClockwise(polygon) == isDrillPolygonClockwise) {
				drillFacet.reverse()
			}
			drillFacets[drillFacetIndex] = drillFacet
			facets[intersectingFacetIndex] = getConnectedFacet([intersectingFacet, drillFacet], inversePoints)
		}
		var facetBegin = drillFacets[0]
		var facetEnd = drillFacets[1]
		var facetLengthMinus = facetBegin.length - 1
		for (var pointIndex = 0; pointIndex < facetBegin.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % facetBegin.length
			var bottomBeginIndex = facetBegin[nextIndex]
			var bottomEndIndex = facetBegin[pointIndex]
			var topBeginIndex = facetEnd[facetLengthMinus - pointIndex]
			var topEndIndex = facetEnd[facetLengthMinus - nextIndex]
			var polygonFacet = [bottomBeginIndex, bottomEndIndex, topBeginIndex, topEndIndex]
			facets.push(polygonFacet)
		}
		pushArray(points, getXYZsBy3DMatrix(matrix, inversePoints.slice(points.length, inversePoints.length)))
	}
}

function getEdgeKey(aString, bString) {
	if (bString > aString) {
		return aString + ' ' + bString
	}
	return bString + ' ' + aString
}

function getEdgesByFacet(facet, z, zList) {
	var edges = []
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var vertexIndexNext = (vertexIndex + 1) % facet.length
		var zVertex = zList[vertexIndex]
		var zNext = zList[vertexIndexNext]
		if (zVertex != z || zNext != z) {
			if (zVertex == z) {
				edges.push(facet[vertexIndex].toString())
			}
			else {
				if (zNext == z) {
					edges.push(facet[vertexIndexNext].toString())
				}
				else {
					if ((zVertex < z) != (zNext < z)) {
						edges.push(getEdgeKey(facet[vertexIndex].toString(), facet[vertexIndexNext].toString()))
					}
				}
			}
		}
	}
	if (edges.length < 2) {
		return null
	}
	if (edges[0] == edges[1]) {
		return null
	}
	return edges
}

function getExtrusionMesh(isJoined, layers, transform3D) {
	if (layers.length == 0) {
		return null
	}
	if (layers[0].polygons.length == 0) {
		return null
	}
	var isClockwise = null
	var isUpsideDown = false
	var polygon3DLists = []
	for (var polygonIndex = 0; polygonIndex < layers[0].polygons.length; polygonIndex++) {
		polygon3DLists.push([])
	}
	for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		var layer = layers[layerIndex]
		var nextIndex = layerIndex + 1
		if (nextIndex < layers.length) {
			var nextLayer = layers[nextIndex]
			if (layer.polygons.length != nextLayer.polygons.length) {
				return null
			}
			for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
				if (layer.polygons[polygonIndex].length != nextLayer.polygons[polygonIndex].length) {
					return null
				}
			}
		}
		for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
			var polygon = layer.polygons[polygonIndex]
			if (isClockwise == null && polygon.length > 2) {
				isClockwise = getIsClockwise(polygon)
				isUpsideDown = layers[0].height > layers[layers.length - 1].height
				if (!isClockwise) {
					isUpsideDown = !isUpsideDown
				}
			}
			polygon3DLists[polygonIndex].push(getPolygon3D(polygon, layer.height))
		}
	}
	var facetsLayers = null
	var facets = []
	var points = []
	for (var polygon3Ds of polygon3DLists) {
		if (isUpsideDown) {
			polygon3Ds.reverse()
		}
		var endFacets = []
		addPolygon3DsToMesh(endFacets, facets, points, polygon3Ds)
		if (facetsLayers == null) {
			facetsLayers = Array(endFacets.length).fill(null)
		}
		for (var endFacetIndex = 0; endFacetIndex < endFacets.length; endFacetIndex++) {
			facetsLayers[endFacetIndex] = getPushElement(facetsLayers[endFacetIndex], endFacets[endFacetIndex])
		}
	}
	for (var facetsLayer of facetsLayers) {
		addInsideConnectedFacets(facetsLayer, facets, points)
	}
	return {facets:facets, points:points}
}

function getIntersectingFacetIndexes(facets, points, polygon) {
	var intersectingFacetIndexes = null
	var facetPolygons = getPolygonsByFacets(facets, points)
	for (var facetPolygonIndex = 0; facetPolygonIndex < facetPolygons.length; facetPolygonIndex++) {
		var facetPolygon = facetPolygons[facetPolygonIndex]
		if (getIsPolygonIntersecting(facetPolygon, polygon)) {
			intersectingFacetIndexes = getPushElement(intersectingFacetIndexes, facetPolygonIndex)
		}
	}
	return intersectingFacetIndexes
}

function getIntersectingFacetIndexesByHeight(facets, heights, points, polygon) {
	var intersectingFacetIndexes = getIntersectingFacetIndexes(facets, points, polygon)
	if (intersectingFacetIndexes == null) {
		warningByList(['In getIntersectingFacetIndexesByHeight intersectingFacetIndexes == null', polygon, facets, points])
		return
	}
	for (var intersectingIndexIndex = 0; intersectingIndexIndex < intersectingFacetIndexes.length; intersectingIndexIndex++) {
		var intersectingFacetIndex = intersectingFacetIndexes[intersectingIndexIndex]
		var z = getZByPointPolygon(polygon[0], getPolygonByFacet(facets[intersectingFacetIndex], points))
		intersectingFacetIndexes[intersectingIndexIndex] = [z, intersectingFacetIndex]
	}
	intersectingFacetIndexes.sort(compareFirstElementAscending)
	if (heights == null) {
		for (var intersectingIndexIndex = 0; intersectingIndexIndex < intersectingFacetIndexes.length; intersectingIndexIndex++) {
			intersectingFacetIndexes[intersectingIndexIndex] = intersectingFacetIndexes[intersectingIndexIndex][1]
		}
		return intersectingFacetIndexes
	}
	var intersectingFacetIndexesByHeight = null
	heights.sort(compareNumberAscending)
	var ranges = []
	for (var heightIndex = 0; heightIndex < heights.length; heightIndex += 2) {
		var heightNextIndex = heightIndex + 1
		if (heightNextIndex < heights.length) {
			ranges.push([heights[heightIndex], heights[heightNextIndex]])
		}
	}
	for (var intersectingFacetIndex of intersectingFacetIndexes) {
		if (getIsInRanges(ranges, intersectingFacetIndex[0])) {
			intersectingFacetIndexesByHeight = getPushElement(intersectingFacetIndexesByHeight, intersectingFacetIndex[1])
		}
	}
	return intersectingFacetIndexesByHeight
}

function getIsFacetPointingOutside(facet, mesh) {
	var normal = getNormalByFacet(facet, mesh.points)
	if (normal == null || facet.length < 3) {
		return null
	}
	var rotatedPoints = getArraysCopy(mesh.points)
	rotateXYZsByBasis(gXZRotationBasis, rotatedPoints, [normal[0], -normal[2]])
	var normal = getNormalByFacet(facet, rotatedPoints)
	if (normal == null) {
		return null
	}
	rotateXYZsByBasis(gXYRotationBasis, rotatedPoints, [normal[0], -normal[1]])
	var rotatedMesh = {facets:mesh.facets, points:rotatedPoints}
	var triangleMiddle = getTriangleMiddle(rotatedPoints[facet[0]], rotatedPoints[facet[1]], rotatedPoints[facet[2]])
	var xIntersections = getXIntersectionsByMesh(rotatedMesh, triangleMiddle[1], triangleMiddle[2])
	var numberOfIntersectionsToLeft = 0
	var triangleMiddleXPlus = triangleMiddle[0] + gClose
	for (var xIntersection of xIntersections) {
		if (xIntersection < triangleMiddleXPlus) {
			numberOfIntersectionsToLeft += 1
		}
	}
	if (numberOfIntersectionsToLeft == 0) {
		return null
	}
	return numberOfIntersectionsToLeft % 2 == 0
}

function getIsInRanges(ranges, value) {
	for (var range of ranges) {
		if (value >= range[0] && value <= range[1]) {
			return true
		}
	}
	return false
}

function getJoinedCoplanarMesh(mesh) {
	var facets = mesh.facets
	var facetsMap = new Map()
	var linkMap = new Map()
	var normals = new Array(facets.length)
	var points = mesh.points
	for (facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var normal = getNormalByFacet(facet, points)
		if (normal != null) {
			normals[facetIndex] = normal
			for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var nextIndex = (vertexIndex + 1) % facet.length
				var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
				addArrayElementToMap(facetIndex, edgeKey, facetsMap)
			}
		}
	}
	for (var facetIndexes of facetsMap.values()) {
		if (facetIndexes.length == 2) {
			var facetIndex0 = facetIndexes[0]
			var facetIndex1 = facetIndexes[1]
			if (getXYZLengthSquared(getXYZSubtraction(normals[facetIndex0], normals[facetIndex1])) < 0.0000001) {
				addToLinkMap(facetIndex0, facetIndex1, linkMap)
			}
		}
	}
	var colinearities = new Array(points.length).fill(0)
	var joinedMap = getJoinedMap(facets.length, linkMap)
	var joinedFacetArrays = new Array(joinedMap.size)
	var joinedFacetArraysLength = 0
	var connectedFacets = new Array(joinedMap.size)
	for (var joined of joinedMap.values()) {
		var coplanarFacets = new Array(joined.length)
		for (var facetIndexIndex = 0; facetIndexIndex < joined.length; facetIndexIndex++) {
			var coplanarFacet = facets[joined[facetIndexIndex]]
			coplanarFacets[facetIndexIndex] = coplanarFacet
		}
		var joinedFacets = getJoinedFacets(coplanarFacets)

		for (var joinedFacetIndex = 0; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
			var joinedFacet = joinedFacets[joinedFacetIndex]
			for (vertexIndex = 0; vertexIndex < joinedFacet.length; vertexIndex++) {
				var beginVertex = joinedFacet[(vertexIndex + joinedFacet.length - 1) % joinedFacet.length]
				var centerVertex = joinedFacet[vertexIndex]
				var endVertex = joinedFacet[(vertexIndex + 1) % joinedFacet.length]
				if (getIsColinear(points[beginVertex], points[centerVertex], points[endVertex])) {
					colinearities[centerVertex] += 1
				}
			}
		}

		joinedFacetArrays[joinedFacetArraysLength] = joinedFacets
		joinedFacetArraysLength += 1

	}
	for (var connectedFacetIndex = 0; connectedFacetIndex < joinedFacetArrays.length; connectedFacetIndex++) {
		var joinedFacets = joinedFacetArrays[connectedFacetIndex]
		for (var joinedFacetIndex = 0; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
			var joinedFacet = joinedFacets[joinedFacetIndex]
			for (vertexIndex = 0; vertexIndex < joinedFacet.length; vertexIndex++) {
				if (colinearities[joinedFacet[vertexIndex]] == 2) {
					joinedFacet[vertexIndex] = null
				}
			}
			joinedFacets[joinedFacetIndex] = joinedFacet.filter(notNullCheck)
		}
		connectedFacets[connectedFacetIndex] = getConnectedFacet(joinedFacets, points)
	}
	var pointIndexes = new Array(points.length).fill(false)
	for (var facet of connectedFacets) {
		for (var vertex of facet) {
			pointIndexes[vertex] = true
		}
	}
	var pointLength = 0
	for (var pointIndexIndex = 0; pointIndexIndex < pointIndexes.length; pointIndexIndex++) {
		if (pointIndexes[pointIndexIndex]) {
			pointIndexes[pointIndexIndex] = pointLength
			points[pointLength] = points[pointIndexIndex]
			pointLength += 1
		}
	}
	points.length = pointLength
	for (var facet of connectedFacets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			facet[vertexIndex] = pointIndexes[facet[vertexIndex]]
		}
	}
	return {facets:connectedFacets, points:points}
}

function getLargeFacet(mesh) {
	var largeFacet = null
	var greatestMinimumLengthSquared = -1
	var points = mesh.points
	for (var facet of mesh.facets) {
		var minimumLengthSquared = Number.MAX_VALUE
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var lengthSquared = getXYZLengthSquared(getXYZSubtraction(points[vertexIndex], points[nextIndex]))
			minimumLengthSquared = Math.min(lengthSquared, minimumLengthSquared)
		}
		if (minimumLengthSquared > greatestMinimumLengthSquared) {
			greatestMinimumLengthSquared = minimumLengthSquared
			largeFacet = facet
		}
	}
	return largeFacet
}

function getMeshAnalysis(mesh) {
	if (mesh == null) {
		return null
	}
	if (mesh.facets.length == 0) {
		return null
	}
	var arrowsMap = new Map()
	var attributeMap = new Map()
	var facetsMap = new Map()
	var linkMap = new Map()
	var loneEdges = []
	var greatestFacetVertexes = -1
	var moreThanDoubleEdges = []
	var numberOfEdges = 0
	var numberOfIdenticalPoints = 0
	var points = mesh.points
	var unidirectionalEdges = []
	var numberOfUnidirectionalEdges = 0
	for (facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
		var facet = mesh.facets[facetIndex]
		if (facet.length > greatestFacetVertexes) {
			greatestFacetVertexes = facet.length
		}
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var vertex = facet[vertexIndex]
			var nextVertex = facet[nextIndex]
			if (points[vertex].toString() == points[nextVertex].toString()) {
				numberOfIdenticalPoints += 1
			}
			var edgeKey = getEdgeKey(vertex.toString(), nextVertex.toString())
			var arrow = vertex.toString() + ' ' + nextVertex.toString()
			addArrayElementToMap(arrow, edgeKey, arrowsMap)
			addArrayElementToMap(facetIndex, edgeKey, facetsMap)
		}
	}
	var facetIndexSet = new Set()
	for (var facet of mesh.facets) {
		facetIndexSet.clear()
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			addElementsToSet(facetsMap.get(edgeKey), facetIndexSet)
		}
		var greatestFacetIndex = -1
		for (var facetIndex of facetIndexSet) {
			var linkFacetIndex = null
			if (linkMap.has(facetIndex)) {
				linkFacetIndex = linkMap.get(facetIndex)
			}
			if (linkFacetIndex == null) {
				linkFacetIndex = facetIndex
			}
			greatestFacetIndex = Math.max(greatestFacetIndex, linkFacetIndex)
		}
		for (var facetIndex of facetIndexSet) {
			if (facetIndex != greatestFacetIndex) {
				linkMap.set(facetIndex, greatestFacetIndex)
			}
		}
	}
	for (var arrows of arrowsMap.values()) {
		numberOfEdges += 1
		if (arrows.length == 1) {
			loneEdges.push(arrows[0])
		}
		else {
			if (arrows.length > 2) {
				moreThanDoubleEdges.push(arrows)
				var arrowStrings = arrows[0].split(' ')
				var edgeKey = getEdgeKey(arrowStrings[0], arrowStrings[1])
				var facetIndexes = facetsMap.get(edgeKey)
				for (var facetIndex of facetIndexes) {
					var facet = mesh.facets[facetIndex]
					moreThanDoubleEdges.push(facet)
					for (var vertex of facet) {
						moreThanDoubleEdges.push(points[vertex])
					}
				}
				for (var arrow of arrows) {
					var arrowStrings = arrow.split(' ')
					moreThanDoubleEdges.push(points[parseInt(arrowStrings[0])])
					moreThanDoubleEdges.push(points[parseInt(arrowStrings[1])])
				}
			}
			else {
				if (arrows[0] == arrows[1]) {
					unidirectionalEdges.push(arrows[0])
				}
			}
		}
	}
	var joinedMap = getJoinedMap(mesh.facets.length, linkMap)
	var largeFacet = getLargeFacet(mesh)
	var numberOfTooThinFacets = 0
	for (var facet of mesh.facets) {
		if (getNormalByFacet(facet, points) == null) {
			numberOfTooThinFacets += 1
		}
	}
	var isFacetPointingOutside = null
	var numberOfIncorrectEdges = loneEdges.length + moreThanDoubleEdges.length + unidirectionalEdges.length
	if (numberOfIncorrectEdges == 0) {
		isFacetPointingOutside = getIsFacetPointingOutside(getLargeFacet(mesh), mesh)
	}
	if (isFacetPointingOutside == null) {
		isFacetPointingOutside = 'Meaningless because mesh is incorrect.'
	}
	var numberOfErrors = numberOfIncorrectEdges + numberOfTooThinFacets
	attributeMap.set('greatestFacetVertexes', greatestFacetVertexes.toString())
	attributeMap.set('isFacetPointingOutside', isFacetPointingOutside.toString())
	if (loneEdges.length > 0) {
		attributeMap.set('loneEdges', loneEdges.join(';'))
	}
	var meshBoundingBox = getMeshBoundingBox(mesh)
	attributeMap.set('boundingBox', meshBoundingBox[0].toString() + ' ' + meshBoundingBox[1].toString())
	attributeMap.set('numberOfEdges', numberOfEdges.toString())
	attributeMap.set('numberOfErrors', numberOfErrors.toString())
	attributeMap.set('numberOfFacets', mesh.facets.length.toString())
	attributeMap.set('numberOfIdenticalPoints', numberOfIdenticalPoints.toString())
	attributeMap.set('numberOfIncorrectEdges', numberOfIncorrectEdges.toString())
	attributeMap.set('numberOfShapes', joinedMap.size.toString())
	attributeMap.set('numberOfTooThinFacets', numberOfTooThinFacets.toString())
	if (moreThanDoubleEdges.length > 0) {
		attributeMap.set('moreThanDoubleEdges', moreThanDoubleEdges.join(';'))
	}
	if (unidirectionalEdges.length > 0) {
		attributeMap.set('unidirectionalEdges', unidirectionalEdges.join(';'))
	}
	return attributeMap
}

function getMeshBoundingBox(mesh) {
	var boundingBox = null
	var points = mesh.points
	for (var facet of mesh.facets) {
		for (var vertexIndex of facet) {
			var point = points[vertexIndex]
			if (boundingBox == null) {
				boundingBox = [point.slice(0), point.slice(0)]
			}
			else {
				widenBoundingBox(boundingBox, point)
			}
		}
	}
	return boundingBox
}

function getMeshByLattice(lattice) {
	var lines = []
	var pointMap = new Map()
	var tipMap = new Map()
	var voxelMap = getVoxelMapByXYZLattice(lattice)
	addVoxelLines(2, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(0, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(1, voxelMap, lines, pointMap, tipMap)
	return getJoinedCoplanarMesh(getMeshByTipMap(pointMap, tipMap))
}

function getMeshByPolygons(polygons) {
	var facets = new Array(polygons.length)
	var pointMap = new Map()
	var points = []
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygon = polygons[polygonIndex]
		var facet = new Array(polygon.length)
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var point = polygon[pointIndex]
			var pointString = point.join(',')
			if (pointMap.has(pointString)) {
				facet[pointIndex] = pointMap.get(pointString)
			}
			else {
				facet[pointIndex] = points.length
				pointMap.set(pointString, points.length)
				points.push(point)
			}
		}
		facets[polygonIndex] = facet
	}
	return {facets:facets, points:points}
}

function getNormalByFacet(facet, points) {
	if (facet.length < 3) {
		return null
	}
	var lastNormal = null
	var crossProductLengthTotal = 0.0
	for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var center = points[facet[vertexIndex]]
		var pointA = points[facet[(vertexIndex + 1) % facet.length]]
		var pointB = points[facet[(vertexIndex + 2) % facet.length]]
		var vectorA = getXYZSubtraction(pointA, center)
		var vectorB = getXYZSubtraction(pointB, center)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		if (vectorALength != 0.0 && vectorBLength != 0.0) {
			divideXYZByScalar(vectorA, vectorALength)
			divideXYZByScalar(vectorB, vectorBLength)
			if (Math.abs(getXYZDotProduct(vectorA, vectorB)) < 0.9999999) {
				var crossProduct = getCrossProduct(vectorA, vectorB)
				var crossProductLength = getXYZLength(crossProduct)
				var normal = divideXYZByScalar(crossProduct, crossProductLength)
				if (lastNormal == null) {
					lastNormal = normal
					crossProductLengthTotal += crossProductLength
				}
				else {
					if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
						crossProductLengthTotal += crossProductLength
					}
					else {
						invertXYZ(normal)
						if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
							crossProductLengthTotal -= crossProductLength
						}
						else {
							return null
						}
					}
				}
			}
		}
	}
	if (crossProductLengthTotal < 0.0) {
		return invertXYZ(lastNormal)
	}
	return lastNormal
}

function getNormalByFlatFacet(facet, points) {
	if (facet.length < 3) {
		return null
	}
	var lastNormal = null
	var crossProductLengthTotal = 0.0
	for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var center = points[facet[vertexIndex]]
		var pointA = points[facet[(vertexIndex + 1) % facet.length]]
		var pointB = points[facet[(vertexIndex + 2) % facet.length]]
		var vectorA = getXYZSubtraction(pointA, center)
		var vectorB = getXYZSubtraction(pointB, center)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		if (vectorALength != 0.0 && vectorBLength != 0.0) {
			divideXYZByScalar(vectorA, vectorALength)
			divideXYZByScalar(vectorB, vectorBLength)
			if (Math.abs(getXYZDotProduct(vectorA, vectorB)) < 0.9999999) {
				var crossProduct = getCrossProduct(vectorA, vectorB)
				var crossProductLength = getXYZLength(crossProduct)
				var normal = divideXYZByScalar(crossProduct, crossProductLength)
				if (lastNormal == null) {
					lastNormal = normal
					crossProductLengthTotal += crossProductLength
				}
				else {
					if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
						crossProductLengthTotal += crossProductLength
					}
					else {
						invertXYZ(normal)
						if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
							crossProductLengthTotal -= crossProductLength
						}
					}
				}
			}
		}
	}
	if (crossProductLengthTotal < 0.0) {
		return invertXYZ(lastNormal)
	}
	return lastNormal
}

function getPillarMesh(heights, isSeparate, polygons, transform3D) {
	if (polygons.length == 0 || heights.length == 0) {
		return null
	}
	var facetsLayers = null
	var facets = []
	var isUpsideDown = false
	var points = []
	for (var polygon of polygons) {
		if (polygon.length > 2) {
			isUpsideDown = heights[0] > heights[heights.length - 1]
			if (!getIsClockwise(polygon)) {
				isUpsideDown = !isUpsideDown
			}
			break
		}
	}
	for (var polygon of polygons) {
		if (polygon.length > 0) {
			if (isUpsideDown) {
				polygon.reverse()
			}
			var endFacets = []
			var polygon3D = getPolygon3D(polygon, 0.0)
			if (isSeparate) {
				for (var heightIndex = 0; heightIndex < heights.length; heightIndex += 2) {
					addToPillarMesh(endFacets, facets, heights.slice(heightIndex, heightIndex + 2), points, polygon3D)
				}
			}
			else {
				addToPillarMesh(endFacets, facets, heights, points, polygon3D)
			}
			if (facetsLayers == null) {
				facetsLayers = Array(endFacets.length).fill(null)
			}
			for (var endFacetIndex = 0; endFacetIndex < endFacets.length; endFacetIndex++) {
				facetsLayers[endFacetIndex] = getPushElement(facetsLayers[endFacetIndex], endFacets[endFacetIndex])
			}
		}
	}
	for (var facetsLayer of facetsLayers) {
		addInsideConnectedFacets(facetsLayer, facets, points)
	}
	return {facets:facets, points:points}
}

function getPointAlongEdge(edge, points, z) {
	var nodes = edge.split(' ')
	var begin = points[nodes[0]]
	if (nodes.length == 1) {
		return begin.slice(0, 2)
	}
	var end = points[nodes[1]]
	var endZ = end[2]
	return getXYByPortion((endZ - z) / (endZ - begin[2]), begin, end)
}

function getPointIndexesPrunePoints(points) {
	var pointIndexes = new Array(points.length)
	var pointLength = 0
	var pointStringIndexMap = new Map()
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var pointString = points[pointIndex].join(',')
		if (pointStringIndexMap.has(pointString)) {
			pointIndexes[pointIndex] = pointStringIndexMap.get(pointString)
		}
		else {
			pointStringIndexMap.set(pointString, pointLength)
			pointIndexes[pointIndex] = pointLength
			points[pointLength] = points[pointIndex]
			pointLength += 1
		}
	}
	points.length = pointLength
	return pointIndexes
}

function getPolygon3D(polygon, z) {
	if (polygon.length == 0) {
		return polygon
	}
	if (polygon[0].length > 2) {
		return polygon
	}
	var polygon3D = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var vertex = polygon[vertexIndex]
		polygon3D[vertexIndex] = [vertex[0], vertex[1], z]
	}
	return polygon3D
}

function getPolygonFacet(pointIndexStart, polygon3D) {
	var polygonFacet = new Array(polygon3D.length)
	for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexStart
		pointIndexStart += 1
	}
	return polygonFacet
}

function getTriangleMesh(mesh) {
	var facets = mesh.facets
	var triangleFacets = []
	for (var facet of facets) {
		triangleFacets.push([facet[0], facet[1], facet[2]])
		for (vertexIndex = 2; vertexIndex < facet.length - 1; vertexIndex++) {
			triangleFacets.push([facet[0], facet[vertexIndex], facet[vertexIndex + 1]])
		}
	}
	return {facets:triangleFacets, points:mesh.points}
}

function getTriangleMeshString(filetype, id, mesh) {
	if (filetype.toLowerCase() != 'stl') {
		return null
	}
//solid your_name 
//facet normal
//  outer loop
//    vertex
//    vertex
//    vertex
//  endloop
//endfacet
//endsolid
	var meshStrings = ['solid ' + id]
	var points = mesh.points
	for (var facet of mesh.facets) {
		var normal = getNormalByFacet(facet, points)
		var normalStrings = ['facet']
		if (normal != null) {
			normalStrings.push('normal')
			for (var parameter of normal) {
				normalStrings.push(parameter.toFixed(2))
			}
		}
		meshStrings.push(normalStrings.join(' '))
		meshStrings.push('  outer loop')
		for (var pointIndex of facet) {
			meshStrings.push('    vertex ' + points[pointIndex].toString().replace(/,/g, ' '))
		}
		meshStrings.push('  endloop')
		meshStrings.push('endfacet')
	}
	meshStrings.push('endsolid')
	return meshStrings.join('\n')
}

function getXIntersectionsByMesh(mesh, y, z) {
	var xIntersections = []
	var xyPolygons = getXYPolygonsByZ(mesh, z)
	for (var xyPolygon of xyPolygons) {
		addXIntersectionsByPolygon(xIntersections, xyPolygon, y)
	}
	return xIntersections
}

function getXYPolygonsByZ(mesh, z) {
	var facets = mesh.facets
	var arrowsMap = new Map()
	var points = mesh.points
	for (var facet of facets) {
		var zList = new Array(facet.length)
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zList[vertexIndex] = points[facet[vertexIndex]][2]
		}
		var edges = getEdgesByFacet(facet, z, zList)
		if (edges != null) {
			addToArrowsMap(arrowsMap, edges)
		}
	}
	return getXYPolygonsByArrows(arrowsMap, points, z)
}

function getXYPolygonsMapByMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPolygonsMap = new Map()
	for (var facet of facets) {
		var zList = []
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (var vertex of facet) {
			var z = points[vertex][2]
			zList.push(z)
			maximumZ = Math.max(maximumZ, z)
			minimumZ = Math.min(minimumZ, z)
		}
		maximumZ = Math.floor(maximumZ + 1.001)
		minimumZ = Math.ceil(minimumZ)
		for (var z = minimumZ; z < maximumZ; z++) {
			var edges = getEdgesByFacet(facet, z, zList)
			if (edges != null) {
				var arrowsMap = null
				if (xyPolygonsMap.has(z)) {
					arrowsMap = xyPolygonsMap.get(z)
				}
				else {
					arrowsMap = new Map()
					xyPolygonsMap.set(z, arrowsMap)
				}
				addToArrowsMap(arrowsMap, edges)
			}
		}
	}
 	for (var entry of xyPolygonsMap) {
		var z = entry[0]
		xyPolygonsMap.set(z, getXYPolygonsByArrows(entry[1], points, z))
	}
	return xyPolygonsMap
}

function linkFacetVertexes(pointIndexes, polygonFacet) {
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexes[polygonFacet[vertexIndex]]
	}
	return polygonFacet
}

function removeArrowFromMap(arrows, arrowsMap, key) {
	if (arrows.length == 1) {
		arrowsMap.set(key, null)
	}
	else {
		arrows.shift()
	}
}
