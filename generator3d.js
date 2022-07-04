//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetsAlongLoneEdges(facets, layerFacetLists, pointLayerMap, points) {
	var arrowMap = new Map()
	var arrowSet = new Set()
	for (var facet of facets) {
		addFacetToLoneArrowSet(0, facet, arrowSet)
	}
	for (var arrow of arrowSet) {
		var arrowStrings = arrow.split(' ')
		arrowMap.set(parseInt(arrowStrings[1]), parseInt(arrowStrings[0]))
	}
	for (var key of arrowMap.keys()) {
		if (arrowMap.get(key) != null) {
			var facet = []
			while (facet.length < gLengthLimit) {
				var nextKey = arrowMap.get(key)
				if (nextKey == null) {
					pointLayerMap.get(facet[0]).push(facet)
					break
				}
				else {
					facet.push(key)
					arrowMap.set(key, null)
					key = nextKey
				}
			}
		}
	}
	for (var layerFacets of layerFacetLists) {
		var facetGroups = getFacetGroups(layerFacets, points)
		for (var facetGroup of facetGroups) {
			facets.push(getConnectedFacet(facetGroup, points))
		}
	}
	return facets
}

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

function addFacetsByBottomTopFacet(bottomFacet, facets, topFacet) {
	for (var vertexIndex = 0; vertexIndex < bottomFacet.length; vertexIndex++) {
		var endIndex = (vertexIndex + 1) % bottomFacet.length
		facets.push([bottomFacet[endIndex], bottomFacet[vertexIndex], topFacet[vertexIndex], topFacet[endIndex]])
	}
}

function addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points) {
	var horizontalFacetsZero = horizontalFacetsGroup[0]
	var bottomFacet = horizontalFacetsZero[0]
	var topFacet = horizontalFacetsZero[horizontalFacetsZero.length - 1]
	if (horizontalFacetsGroup.length > 1) {
		var pointMap = new Map()
		var bottomFacets = new Array(horizontalFacetsGroup.length)
		for (var horizontalIndex = 0; horizontalIndex < horizontalFacetsGroup.length; horizontalIndex++) {
			var horizontalFacets = horizontalFacetsGroup[horizontalIndex]
			var horizontalBottomFacet = horizontalFacets[0]
			bottomFacets[horizontalIndex] = horizontalBottomFacet
			for (var vertexIndex = 0; vertexIndex < horizontalBottomFacet.length; vertexIndex++) {
				pointMap.set(horizontalBottomFacet[vertexIndex], horizontalFacets[horizontalFacets.length - 1][vertexIndex])
			}
		}
		bottomFacet = getConnectedFacet(bottomFacets, points)
		topFacet = new Array(bottomFacet.length)
		var vertexIndex = 0
		for (var pointIndex of bottomFacet) {
			topFacet[vertexIndex] = pointMap.get(pointIndex)
			vertexIndex += 1
		}
	}
	facets.push(bottomFacet)
	for (var horizontalFacets of horizontalFacetsGroup) {
		for (var horizontalFacetIndex = 0; horizontalFacetIndex < horizontalFacets.length - 1; horizontalFacetIndex++) {
			addFacetsByBottomTopFacet(horizontalFacets[horizontalFacetIndex], facets, horizontalFacets[horizontalFacetIndex + 1])
		}
	}
	topFacet.reverse()
	facets.push(topFacet)
}

function addHolesToFacet(facetIndex, holePolygonLists, mesh) {
	var facet = mesh.facets[facetIndex]
	var points = mesh.points
	var polygon = getPolygonByFacet(facet, points)
	var isClockwise = getIsClockwise(polygon)
	var minimumX = polygon[0][0]
	var z = polygon[0][2]
	for (var polygonIndex = 1; polygonIndex < polygon.length; polygonIndex++) {
		minimumX = Math.min(minimumX, polygon[polygonIndex][0])
	}
	var pointIndex = points.length
	var holePolygons = holePolygonLists[Math.round(minimumX)]
	var holeFacets = new Array(holePolygons.length)
	for (var holeIndex = 0; holeIndex < holePolygons.length; holeIndex++) {
		var holePolygon = holePolygons[holeIndex]
		var holeFacet = new Array(holePolygon.length)
		points.length += holePolygon.length
		for (var vertexIndex = 0; vertexIndex < holePolygon.length; vertexIndex++) {
			holeFacet[vertexIndex] = pointIndex
			points[pointIndex] = [holePolygon[vertexIndex][0] + minimumX, holePolygon[vertexIndex][1], z]
			pointIndex += 1
		}
		if (isClockwise) {
			holeFacet.reverse()
		}
		holeFacets[holeIndex] = holeFacet
	}
	mesh.facets[facetIndex] = getConnectedFacet(pushArray([facet], holeFacets), points)
}

function addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width) {
	var holePolygonLists = new Array(tops.length - 1)
	for (var topIndex = 0; topIndex < tops.length - 1; topIndex++) {
		var nextIndex = topIndex + 1
		var top = tops[topIndex]
		var nextTop = tops[nextIndex]
		var bottom = Math.max(bottoms[topIndex], bottoms[nextIndex])
		var outerTopRight = [getXYDistance(top, nextTop), Math.min(top[2], nextTop[2])]
		var innerLeft = thickness
		if (topIndex > 0) {
			innerLeft *= 0.5
		}
		var rightThickness = thickness
		if (topIndex < tops.length - 2) {
			rightThickness *= 0.5
		}
		var innerRight = outerTopRight[0] - rightThickness
		holePolygons = getHolePolygons(innerLeft, innerRight, bottom, outerTopRight, overhangAngle, thickness, width)
		var multiplier = [1.0 / outerTopRight[0], 1.0 / (outerTopRight[1] - bottom)]
		holePolygonLists[topIndex] = addArrayArraysByY(multiplyXYArrays(holePolygons, multiplier), -bottom * multiplier[1])
	}
	var facetIndexes = getHorizontalFacetIndexes(mesh)
	for (var facetIndex of facetIndexes) {
		addHolesToFacet(facetIndex, holePolygonLists, mesh)
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

function addToExtrusionMesh(isJoined, matrices, mesh, polygon3DGroup) {
	var facets = mesh.facets
	var points = mesh.points
	var pointIndex = points.length
	var horizontalFacetsGroup = new Array(polygon3DGroup.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DGroup.length; polygon3DIndex++) {
		var polygon3D = polygon3DGroup[polygon3DIndex]
		var horizontalFacets = new Array(matrices.length)
		points.length += polygon3D.length * matrices.length
		for (var matrixIndex = 0; matrixIndex < matrices.length; matrixIndex++) {
			var horizontalFacet = new Array(polygon3D.length)
			var matrix = matrices[matrixIndex]
			for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
				points[pointIndex] = getXYZBy3DMatrix(matrix, polygon3D[vertexIndex])
				horizontalFacet[vertexIndex] = pointIndex
				pointIndex += 1
			}
			horizontalFacets[matrixIndex] = horizontalFacet
		}
		horizontalFacetsGroup[polygon3DIndex] = horizontalFacets
	}
	addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points)
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

function addToPillarMesh(heights, mesh, polygon3DGroup) {
	var facets = mesh.facets
	var points = mesh.points
	var pointIndex = points.length
	var horizontalFacetsGroup = new Array(polygon3DGroup.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DGroup.length; polygon3DIndex++) {
		var polygon3D = polygon3DGroup[polygon3DIndex]
		var horizontalFacets = new Array(heights.length)
		points.length += polygon3D.length * heights.length
		for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
			var height = heights[heightIndex]
			var horizontalFacet = new Array(polygon3D.length)
			for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
				var vertex = polygon3D[vertexIndex]
				points[pointIndex] = [vertex[0], vertex[1], vertex[2] + height]
				horizontalFacet[vertexIndex] = pointIndex
				pointIndex += 1
			}
			horizontalFacets[heightIndex] = horizontalFacet
		}
		horizontalFacetsGroup[polygon3DIndex] = horizontalFacets
	}
	addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points)
}

function convertPlankToRoad(betweens, centers, curve, matrix, mesh, registry, statement) {
	var top = mesh.points[0][2]
	//y>z -z>y
	for (var point of mesh.points) {
		top = Math.max(top, point[2])
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexesByHeightsOnly(betweens, mesh)
	//z>y -y>z
	for (var point of mesh.points) {
		var z = point[2]
		point[2] = -point[1]
		point[1] = z
	}
	if (getIsEmpty(centers)) {
		return mesh
	}
	var oldWidth = 1.0
	var oldAngle = 0.0
	for (var center of centers) {
		if (center.length < 4) {
			center.length = 4
		}
		if (center[2] == undefined) {
			center[2] = oldWidth
		}
		oldWidth = center[2]
		if (center[3] == undefined) {
			center[3] = oldAngle
		}
		else {
			center[3] = -Math.tan(center[3] * gRadiansPerDegree)
		}
		oldAngle = center[3]
	}
	var firstWidth = centers[0][2]
	var lefts = new Array(centers.length)
	var rights = new Array(centers.length)
	var centersLengthMinus = centers.length - 1
	var insetDeltas = new Array(centers.length)
	for (var vertexIndex = 1; vertexIndex < centersLengthMinus; vertexIndex++) {
		var centerPoint = centers[vertexIndex]
		var centerBegin = normalizeXY(getXYSubtraction(centers[(vertexIndex - 1 + centers.length) % centers.length], centerPoint))
		var centerEnd = normalizeXY(getXYSubtraction(centers[(vertexIndex + 1) % centers.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalizeXY(getXYSubtraction(centers[1], centers[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalizeXY(getXYSubtraction(centers[centersLengthMinus], centers[centers.length - 2]))
	insetDeltas[centersLengthMinus] = [centerBegin[1], -centerBegin[0]]
	for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
		var center = centers[centerIndex]
		var insetRight = getXYMultiplicationByScalar(insetDeltas[centerIndex], 0.5 * center[2])
		lefts[centerIndex] = [center[0] - insetRight[0], center[1] - insetRight[1]]
		rights[centerIndex] = [center[0] + insetRight[0], center[1] + insetRight[1]]
	}
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var left = lefts[xIndex]
		var right = rights[xIndex]
		var y = point[1]
		var oneMinusY = 1.0 - y
		var width = centers[xIndex][2]
		var halfWidth = 0.5 * width
		var aboveCenter = y - 0.5
		var deltaZ = aboveCenter * halfWidth * centers[xIndex][3]
		if (curve != null) {
			variableMap.set('y', (aboveCenter * firstWidth).toString())
			deltaZ += getValueByEquation(registry, statement, curve) * width / firstWidth
			console.log(deltaZ)
		}
		point[0] = oneMinusY * right[0] + y * left[0]
		point[1] = oneMinusY * right[1] + y * left[1]
		point[2] *= 1.0 + (deltaZ / top)
	}
	return mesh
}

function convertPlankToFence(betweens, bottoms, curve, matrix, mesh, registry, statement, tops) {
	var deltaZs = new Array(tops.length)
	tops = getPolygon3D(tops, 1.0)
	for (var topIndex = 0; topIndex < tops.length; topIndex++) {
		deltaZs[topIndex] = tops[topIndex][2] - bottoms[topIndex]
	}
	var deltaZeroZ = deltaZs[0]
	var insetDeltas = new Array(tops.length)
	var topsLengthMinus = tops.length - 1
	for (var vertexIndex = 1; vertexIndex < topsLengthMinus; vertexIndex++) {
		var centerPoint = tops[vertexIndex]
		var centerBegin = normalizeXY(getXYSubtraction(tops[(vertexIndex - 1 + tops.length) % tops.length], centerPoint))
		var centerEnd = normalizeXY(getXYSubtraction(tops[(vertexIndex + 1) % tops.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalizeXY(getXYSubtraction(tops[1], tops[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalizeXY(getXYSubtraction(tops[topsLengthMinus], tops[tops.length - 2]))
	insetDeltas[topsLengthMinus] = [centerBegin[1], -centerBegin[0]]
	//y>z -z>y
	for (var point of mesh.points) {
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexesByHeightsOnly(betweens, mesh)
	var bottomZeroZ = bottoms[0]
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var along = x - xIndex
		var oneMinusAlong = 1.0 - along
		var nextIndex = (xIndex + 1) % tops.length
		var value = 0.0
		if (curve != null) {
			variableMap.set('z', ((point[2] * deltaZeroZ) + bottomZeroZ).toString())
			value = getValueByEquation(registry, statement, curve) * (oneMinusAlong * deltaZs[xIndex] + along * deltaZs[nextIndex])
		}
		point[2] *= oneMinusAlong * tops[xIndex][2] + along * tops[nextIndex][2]
		point[2] += oneMinusAlong * bottoms[xIndex] + along * bottoms[nextIndex]
		var minusY = -point[1] - value
		var inset = getXYAddition(tops[xIndex], getXYMultiplicationByScalar(insetDeltas[xIndex], minusY))
		var nextInset = getXYAddition(tops[nextIndex], getXYMultiplicationByScalar(insetDeltas[nextIndex], minusY))
		point[0] = oneMinusAlong * inset[0] + along * nextInset[0]
		point[1] = oneMinusAlong * inset[1] + along * nextInset[1]
	}
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
}

function getBottoms(registry, statement, tops) {
	var bottoms = getFloatsByStatement('bottoms', registry, statement)
	if (getIsEmpty(bottoms)) {
		bottoms = [0.0]
	}
	var oldBottomLength = bottoms.length
	if (oldBottomLength < tops.length) {
		bottoms.length = tops.length
		for (var bottomIndex = oldBottomLength; bottomIndex < tops.length; bottomIndex++) {
			bottoms[bottomIndex] = bottoms[oldBottomLength - 1]
		}
	}
	return bottoms
}

function getExtrusionMesh(isJoined, matrices, matrix, polygons) {
	if (polygons.length == 0) {
		return null
	}
	var mesh = {facets:[], points:[]}
	var polygonGroups = getPolygonGroups(polygons)
	for (var polygonGroup of polygonGroups) {
		var polygon3DGroup = new Array(polygonGroup.length)
		polygon3DGroup[0] = getPolygon3D(getDirectedPolygon(true, polygonGroup[0]), 0.0)
		for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
			polygon3DGroup[polygonIndex] = getPolygon3D(getDirectedPolygon(false, polygonGroup[polygonIndex]), 0.0)
		}
		addToExtrusionMesh(isJoined, matrices, mesh, polygon3DGroup)
	}
	return removeTriangulateTransform(matrix, mesh)
}

function getFacetConnections(gridMap, gridMultiplier, points, polynode, polynodeIndex, previousLayer) {
	var facetConnections = []
	if (gridMap != null) {
		for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
			var topIndex = polynode[nodeIndex].pointIndex
			var closestPoint = getClosestPoint(gridMap, gridMultiplier, points[topIndex])
			var previousPolynode = previousLayer.polynodes[closestPoint[3]]
			facetConnections.push({bottomIndex:previousPolynode[closestPoint[2]].pointIndex, topIndex:topIndex})
		}
		return facetConnections
	}
	var vertexIndex = 0
	for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
		if (!getIsEmpty(polynode[nodeIndex].connections)) {
			vertexIndex = nodeIndex
			break
		}
	}
	var indexEnd = polynode.length + vertexIndex
	for (var nodeIndex = vertexIndex; nodeIndex < indexEnd; nodeIndex++) {
		var node = polynode[nodeIndex % polynode.length]
		if(node.connections == null) {
			node.connections = [[vertexIndex]]
		}
		for (var connection of node.connections) {
			if (connection.length == 1) {
				connection.push(polynodeIndex)
			}
			var previousPolynode = previousLayer.polynodes[connection[1]]
			vertexIndex = (connection[0] + previousPolynode.length) % previousPolynode.length
			var facetConnection = {bottomIndex:previousPolynode[vertexIndex].pointIndex, topIndex:node.pointIndex}
			facetConnections.push(facetConnection)
			vertexIndex = (vertexIndex + 1) % previousPolynode.length
		}
	}
	return facetConnections
}

function getHorizontalFacetIndexes(mesh) {
	var facets = mesh.facets
	var horizontalFacetIndexes = []
	var points = mesh.points
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var addToFacets = true
		var z = points[facet[0]][2]
		for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
			if (points[facet[vertexIndex]][2] != z) {
				addToFacets = false
				break
			}
		}
		if (addToFacets) {
			horizontalFacetIndexes.push(facetIndex)
		}
	}
	return horizontalFacetIndexes
}

function getPillarMesh(heights, matrix, polygons) {
	if (polygons.length == 0) {
		return null
	}
	var mesh = {facets:[], points:[]}
	var polygonGroups = getPolygonGroups(polygons)
	for (var polygonGroup of polygonGroups) {
		var polygon3DGroup = new Array(polygonGroup.length)
		polygon3DGroup[0] = getPolygon3D(getDirectedPolygon(true, polygonGroup[0]), 0.0)
		for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
			polygon3DGroup[polygonIndex] = getPolygon3D(getDirectedPolygon(false, polygonGroup[polygonIndex]), 0.0)
		}
		addToPillarMesh(heights, mesh, polygon3DGroup)
	}
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
	return mesh
}

function getPlankMesh(heights, length) {
	if (length < 1) {
		return null
	}
	var points = []
	var mesh = {facets:[], points:points}
	var numberOfIntervals = length + 1
	var bottom = heights[0]
	var top = heights[heights.length - 1]
	var polygon = [[0.0, bottom, 0.0], [0.0, top, 0.0], [1.0, top, 0.0], [1.0, bottom, 0.0]]
	var zs = new Array(numberOfIntervals)
	for (var intervalIndex = 0; intervalIndex < numberOfIntervals; intervalIndex++) {
		zs[intervalIndex] = intervalIndex
	}
	addToPillarMesh(zs, mesh, [polygon])
	//y>z x>y z>x
	for (var point of points) {
		var x = point[0]
		point[0] = point[2]
		point[2] = point[1]
		point[1] = x
	}
	var betweenHeights = heights.slice(1, -1)
	addSplitIndexesByHeightsOnly(betweenHeights, mesh)
	return mesh
}

function getPolygon3D(polygon, z) {
	if (getIsEmpty(polygon.length)) {
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

function getPolygonNodes(registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == null) {
		return null
	}
	if (statement.tag != 'polygon') {
		return null
	}
	if (!attributeMap.has('nodes')) {
		if (attributeMap.has('points')) {
			attributeMap.set('nodes', attributeMap.get('points'))
		}
		else {
			return null
		}
	}
	var nodeWords = attributeMap.get('nodes').split(' ').filter(lengthCheck)
	if (nodeWords.length == 0) {
		return null
	}
	var oldPoint = []
	var nodes = new Array(nodeWords.length)
	var points = new Array(nodeWords.length)
	for (var nodeWordIndex = 0; nodeWordIndex < nodeWords.length; nodeWordIndex++) {
		var nodeSyllables = nodeWords[nodeWordIndex].split(';')
		var parameters = nodeSyllables[0].split(',')
		if (parameters.length == 1) {
			parameters.push(parameters[0])
		}
		for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
			var parameter = parameters[parameterIndex]
			if (parameter.length > 0) {
				parameters[parameterIndex] = getFloatByEquationIfNaN(registry, statement, parameter)
			}
			else {
				if (oldPoint.length > parameterIndex) {
					parameters[parameterIndex] = oldPoint[parameterIndex]
				}
				else {
					parameters[parameterIndex] = 0.0
				}
			}
		}
		points[nodeWordIndex] = parameters
		var connections = null
		for (var syllableIndex = 1; syllableIndex < nodeSyllables.length; syllableIndex++) {
			if (connections == null) {
				connections = []
			}
			var nodeParameters = nodeSyllables[syllableIndex].split(',')
			for (var parameterIndex = 0; parameterIndex < nodeParameters.length; parameterIndex++) {
				var parameterString = nodeParameters[parameterIndex]
				if (parameterString.length == 0) {
					nodeParameters = null
					break
				}
				else {
					nodeParameters[parameterIndex] = getIntByEquationIfNaN(registry, statement, parameterString)
				}
			}
			if (nodeParameters != null) {
				connections.push(nodeParameters)
			}
		}
		var node = {connections:connections, point:parameters}
		nodes[nodeWordIndex] = node
		oldPoint = parameters
	}
	setPointsHD(points, statement)
	return nodes
}

function getScupltureMesh(layers, matrix) {
	if (layers.length == 0) {
		return null
	}
	var facets = []
	var layerFacetLists = []
	var pointLayerMap = new Map()
	var points = []
	var mesh = {facets:facets, points:points}
	var previousLayer = null
	for (var layer of layers) {
		layer.firstIndex = null
		var layerFacets = []
		layerFacetLists.push(layerFacets)
		var pointIndexMap = new Map()
		for (var polynode of layer.polynodes) {
			for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
				var node = polynode[nodeIndex]
				var point = node.point
				if (point.length < 3) {
					point.length = 3
					point[2] = 0.0
				}
				var pointString = point.toString()
				if (pointIndexMap.has(pointString)) {
					node.pointIndex = pointIndexMap.get(pointString)
				}
				else {
					node.pointIndex = points.length
					pointIndexMap.set(pointString, points.length)
					pointLayerMap.set(points.length, layerFacets)
					if (layer.firstIndex == null) {
						layer.firstIndex = points.length
					}
					points.push(point)
				}
			}
		}
		if (previousLayer != null) {
			var gridMap = null
			var gridMultiplier = null
			if (layer.connection == 'p') {
				gridMap = new Map()
				var previousPoints = []
				for (var polynodeIndex = 0; polynodeIndex < previousLayer.polynodes.length; polynodeIndex++) {
					var polynode = previousLayer.polynodes[polynodeIndex]
					for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
						var nodePoint = polynode[nodeIndex].point
						previousPoints.push([nodePoint[0], nodePoint[1], nodeIndex, polynodeIndex])
					}
				}
				gridMultiplier = getGridMultiplier(gridMap, previousPoints)
			}
			for (var polynodeIndex = 0; polynodeIndex < layer.polynodes.length; polynodeIndex++) {
				var polynode = layer.polynodes[polynodeIndex]
				var facetConnections = getFacetConnections(gridMap, gridMultiplier, points, polynode, polynodeIndex, previousLayer)
				for (var connectionIndex = 0; connectionIndex < facetConnections.length; connectionIndex++) {
					var nextIndex = (connectionIndex + 1) % facetConnections.length
					var connection = facetConnections[connectionIndex]
					var nextConnection = facetConnections[nextIndex]
					var facet = [nextConnection.bottomIndex]
					if (connection.bottomIndex != nextConnection.bottomIndex) {
						facet.push(connection.bottomIndex)
					}
					facet.push(connection.topIndex)
					if (nextConnection.topIndex != connection.topIndex) {
						facet.push(nextConnection.topIndex)
					}
					if (facet.length > 2) {
						facets.push(facet)
					}
				}
			}
		}
		previousLayer = layer
	}
	addFacetsAlongLoneEdges(facets, layerFacetLists, pointLayerMap, points)
	for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		var lastIndex = points.length
		var layer = layers[layerIndex]
		var nextIndex = layerIndex + 1
		if (nextIndex < layers.length) {
			lastIndex = layers[nextIndex].firstIndex
		}
		for (var pointIndex = layer.firstIndex; pointIndex < lastIndex; pointIndex++) {
			points[pointIndex] = getXYZBy3DMatrix(layer.matrix, points[pointIndex])
		}
	}
	return removeTriangulateTransform(matrix, mesh)
}

function getTops(registry, statement) {
	var tops = getPointsByDefault([[0, 0, 20], [20, 0, 20]], 'tops', registry, statement, 'fence')
	removeIdenticalXYPoints(tops)
	return tops
}

function linkFacetVertexes(pointIndexes, polygonFacet) {
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexes[polygonFacet[vertexIndex]]
	}
	return polygonFacet
}

function removeClosePoints(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var linkMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
			if (getArrayDistanceSquared(points[pointIndex], points[nextPointIndex]) < gCloseSquared) {
				addToLinkMap(pointIndex, nextPointIndex, linkMap)
			}
		}
	}
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			if (linkMap.has(pointIndex)) {
				facet[vertexIndex] = linkMap.get(pointIndex)
			}
		}
		removeRepeats(facet)
		if (facet.length < 3) {
			facets[facetIndex] = null
		}
	}
	removeNulls(facets)
}

function removeTooThinFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	removeClosePoints(mesh)
	var segmentMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var point = points[pointIndex]
			for (var checkIndex = vertexIndex + 1; checkIndex < vertexIndex + facet.length - 1; checkIndex++) {
				var beginPointIndex = facet[checkIndex % facet.length]
				var endPointIndex = facet[(checkIndex + 1) % facet.length]
				if (getIsXYZSegmentClose(points[beginPointIndex], points[endPointIndex], point)) {
					addElementToMapArray(pointIndex, getEdgeKey(beginPointIndex, endPointIndex), segmentMap)
				}
			}
		}
	}
	addPointsToFacets(mesh, segmentMap)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		var vertexPointMap = new Map()
		var vertexes = []
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			if (vertexPointMap.has(pointIndex)) {
				vertexes.push(vertexPointMap.get(pointIndex))
				vertexes.push(vertexIndex)
			}
			else {
				vertexPointMap.set(pointIndex, vertexIndex)
			}
		}
		if (vertexes.length > 0) {
			vertexes.sort()
			var separateFacets = []
			for (var vertexIndex = 0; vertexIndex < vertexes.length; vertexIndex++) {
				var nextIndex = (vertexIndex + 1) % vertexes.length
				var vertex = vertexes[vertexIndex]
				var nextVertex = vertexes[nextIndex]
				var separateFacet = null
				if (nextVertex > vertex) {
					separateFacet = facet.slice(vertex, nextVertex)
				}
				else {
					separateFacet = facet.slice(vertex)
					pushArray(separateFacet, facet.slice(0, nextVertex))
				}
				if (separateFacet.length > 2) {
					separateFacets.push(separateFacet)
				}
			}
			if (separateFacets.length == 0) {
				facets.splice(facetIndex, 1)
			}
			else {
				facets[facetIndex] = separateFacets[0]
				for (var separateIndex = 1; separateIndex < separateFacets.length; separateIndex++) {
					facets.push(separateFacets[separateIndex])
				}
			}
		}
	}
}

function removeTriangulateTransform(matrix, mesh) {
	removeTooThinFacets(mesh)
	triangulateBentFacets(mesh)
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
	return mesh
}

function triangulateBentFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPoints = new Array(points.length)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		if (facet.length > 3) {
			if (getNormalByFacetIfFlat(facet, points) == null) {
				var xyzTriangleFacets = getXYZTriangleFacets(facet, points, xyPoints)
				if (xyzTriangleFacets.length == 0) {
					facets.splice(facetIndex, 1)
				}
				else {
					facets[facetIndex] = xyzTriangleFacets[0]
					for (var remainingIndex = 1; remainingIndex < xyzTriangleFacets.length; remainingIndex++) {
						facets.push(xyzTriangleFacets[remainingIndex])
					}
				}
			}
		}
	}
}

var gExtrusion = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'extrusion',
	processStatement:function(registry, statement) {
		var isJoined = getBooleanByDefault(false, 'join', registry, statement, this.name)
		var matrices = get3DMatrices(registry, statement, null)
		var matrix = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var extrusion = new Extrusion(isJoined, matrices, matrix, polygons)
		analyzeOutputMesh(extrusion, registry, statement)
	}
}

var gFence = {
	alterMesh: function(mesh, registry, statement) {
		var tops = getTops(registry, statement)
		var bottoms = getBottoms(registry, statement, tops)
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var curve = getEquation('curve', statement)
		var matrix = getChainMatrix3D(registry, statement)
		convertPlankToFence(betweens, bottoms, curve, null, mesh, registry, statement, tops)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'fence',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var tops = getTops(registry, statement)
		var mesh = getPlankMesh(heights, tops.length - 1)
		var bottoms = getBottoms(registry, statement, tops)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		var thickness = getFloatByDefault(2.0, 'thickness', registry, statement, this.name)
		var width = getFloatByDefault(10.0, 'width', registry, statement, this.name)
		addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(new Mesh(mesh), registry, statement)
	}
}

var gPillar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'pillar',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var pillar = new Pillar(heights, matrix, polygons)
		analyzeOutputMesh(pillar, registry, statement)
	}
}

var gPlank = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'plank',
	processStatement:function(registry, statement) {
		var length = getIntByDefault(1, 'length', registry, statement, this.name)
		var heights = getHeights(registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		var mesh = getPlankMesh(heights, length)
		mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
		analyzeOutputMesh(new Mesh(mesh), registry, statement)
	}
}

var gRoad = {
	alterMesh: function(mesh, registry, statement) {
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var centers = getPointsByDefault([[0, 0, 2], [10, 0]], 'centers', registry, statement, 'road')
		var curve = getEquation('curve', statement)
		var matrix = getChainMatrix3D(registry, statement)
		convertPlankToRoad(betweens, centers, curve, matrix, mesh, registry, statement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'road',
	processStatement:function(registry, statement) {
		var centers = getPointsByDefault([[0, 0, 2], [10, 0]], 'centers', registry, statement, 'road')
		var heights = getHeights(registry, statement, this.name)
		var mesh = getPlankMesh(heights, centers.length - 1)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(new Mesh(mesh), registry, statement)
	}
}

var gScuplture = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'scuplture',
	processStatement:function(registry, statement) {
		var connection = 's'
		var layers = []
		var matrices = get3DMatrices(registry, statement, null)
		for (var child of statement.children) {
			if (child.tag == 'layer') {
				if (layers.length >= matrices.length) {
					break
				}
				var grandchildren = child.children
				var polynodes = []
				if (child.attributeMap.has('copy')) {
					var layerIndex = getIntByDefault(-1, 'copy', registry, child, this.name)
					if (layerIndex < 0) {
						layerIndex += layers.length
					}
					grandchildren = layers[layerIndex].statement.children
				}
				for (var grandchild of grandchildren) {
					var nodes = getPolygonNodes(registry, grandchild)
					if (nodes != null) {
						polynodes.push(nodes)
					}
				}
				if (child.attributeMap.has('connection')) {
					var connectionValue = child.attributeMap.get('connection')
					if (connectionValue.length > 0) {
						var firstLetter = connectionValue[0]
						if (firstLetter == 'l' || firstLetter == 'p' || firstLetter == 's') {
							connection = firstLetter
						}
					}
				}
				layers.push({
					connection:connection,
					matrix:matrices[layers.length],
					polynodes:polynodes,
					statement:child,
					transform3D:null})
			}
		}
		var matrix = getChainMatrix3D(registry, statement)
		var scuplture = new Scuplture(layers, matrix)
		analyzeOutputMesh(scuplture, registry, statement)
	}
}

function Extrusion(isJoined, matrices, matrix, polygons) {
	this.isJoined = isJoined
	this.matrices = matrices
	this.matrix = matrix
	this.mesh = null
	this.polygons = polygons
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getExtrusionMesh(this.isJoined, this.matrices, this.matrix, this.polygons)
		}
		return this.mesh
	}
}

function Mesh(mesh) {
	this.mesh = mesh
	this.getMesh = function() {
		return this.mesh
	}
}

function Pillar(heights, matrix, polygons) {
	this.heights = heights
	this.matrix = matrix
	this.mesh = null
	this.polygons = polygons
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getPillarMesh(this.heights, this.matrix, this.polygons)
		}
		return this.mesh
	}
}

function Scuplture(layers, matrix) {
	this.layers = layers
	this.mesh = null
	this.matrix = matrix
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getScupltureMesh(this.layers, this.matrix)
		}
		return this.mesh
	}
}

var gGenerator3DProcessors = [gExtrusion, gFence, gPillar, gPlank, gRoad, gScuplture]
