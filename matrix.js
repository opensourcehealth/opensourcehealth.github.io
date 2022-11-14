//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gRGBIndex = 0
const gXYRotationBasis = [0, 1]
const gYZRotationBasis = [1, 2]
const gXZRotationBasis = [0, 2]

function add2DArrays(arrays, xy) {
	for (var array of arrays) {
		add2Ds(array, xy)
	}
	return arrays
}

function add2Ds(elements, point) {
	for (var element of elements) {
		add2D(element, point)
	}
	return elements
}

function add3Ds(elements, point) {
	for (var element of elements) {
		add3D(element, point)
	}
	return elements
}

function addArrayArraysByIndex(arrayArrays, addition, index) {
	for (var arrays of arrayArrays) {
		addArraysByIndex(arrays, addition, index)
	}
	return arrayArrays
}
function addArrayArraysByY(arrays, y) {
	for (var array of arrays) {
		addArraysByY(array, y)
	}
	return arrays
}

function addArrays(elements, point, until) {
	for (var element of elements) {
		addArray(element, point, until)
	}
	return elements
}

function addArraysByIndex(arrays, addition, index) {
	for (var array of arrays) {
		array[index] += addition
	}
	return arrays
}

function addArraysByY(xys, y) {
	for (var xy of xys) {
		xy[1] += y
	}
	return xys
}

function addArraysByZ(xyzs, z) {
	for (var xyz of xyzs) {
		xyz[2] += z
	}
	return xyzs
}

function addPointToMatrix3D(matrix, point) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	if (getIsEmpty(point)) {
		return matrix
	}
	matrix[12] = point[0]
	if (point.length > 1) {
		matrix[13] = point[1]
		if (point.length > 2) {
			matrix[14] = point[2]
		}
	}
	return matrix
}

function get2DByMatrix3D(point, matrix) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var x = point[0] * matrix[0] + point[1] * matrix[4] + point[2] * matrix[8] + matrix[12]
	var y = point[0] * matrix[1] + point[1] * matrix[5] + point[2] * matrix[9] + matrix[13]
	return [x, y]
}

function get2DByPortion(portionA, a2D, b2D) {
	var portionB = 1.0 - portionA
	return [portionA * a2D[0] + portionB * b2D[0], portionA * a2D[1] + portionB * b2D[1]]
}

function get2DRotations(xys, xyRotator) {
	var xyRotations = new Array(xys.length)
	for (var xyIndex = 0; xyIndex < xys.length; xyIndex++) {
		xyRotations[xyIndex] = getRotation2DVector(xys[xyIndex], xyRotator)
	}
	return xyRotations
}

function get3DBy3DMatrix(matrix, point) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var x = point[0] * matrix[0] + point[1] * matrix[4] + point[2] * matrix[8] + matrix[12]
	var y = point[0] * matrix[1] + point[1] * matrix[5] + point[2] * matrix[9] + matrix[13]
	var z = point[0] * matrix[2] + point[1] * matrix[6] + point[2] * matrix[10] + matrix[14]
	return [x, y, z]
}

function get3DByKey(key) {
	parameters = key.split(',')
	return [parseFloat(parameters[0]), parseFloat(parameters[1]), parseFloat(parameters[2])]
}

function get3DsBy3DMatrix(matrix, points) {
	if (matrix == null) {
		return points
	}
	var xyzs = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		xyzs[pointIndex] = get3DBy3DMatrix(matrix, points[pointIndex])
	}
	return xyzs
}

function getArraysMultiplicationByScalar(elementLists, scalarMultiplier) {
	var arraysMultiplication = new Array(elementLists.length)
	for (var elementListIndex = 0; elementListIndex < elementLists.length; elementListIndex++) {
		arraysMultiplication[elementListIndex] = getMultiplicationArrayScalar(elementLists[elementListIndex], scalarMultiplier)
	}
	return arraysMultiplication
}

function getBrightness256(brightness) {
	return Math.floor(255.0 * ((brightness) % 1.0))
}

//use getRelativeDirection for ordering because getDirectionalProximity loses accuracy close to the x axis
function getDirectionalProximity(a2D, b2D) {
	var dotProduct = dotProduct2D(a2D, b2D)
	if (a2D[0] * b2D[1] <= a2D[1] * b2D[0]) {
		return dotProduct
	}
	return -3.0 - dotProduct
}

function getFloats(floats) {
	return floats
}

function getInteriorAngle(begin, end, radius) {
	var halfDistance = 0.5 * distance2D(begin, end)
	if (halfDistance > radius) {
		noticeByList(['halfDistance is greater than radius in getInteriorAngle in matrix.', begin, end, radius])
	}
	return 2.0 * Math.asin(halfDistance / radius)
}

function getInverseRotation3D(originalMatrix) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	if (originalMatrix == null) {
		return null
	}
	var determinant = 0.0
	var inverseMatrix = getUnitMatrix3D()
	for (var columnIndex = 0; columnIndex < 3; columnIndex++) {
		for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
			var elementIndex = 4 * columnIndex + rowIndex
			var columnBegin = 0 + (columnIndex == 0)
			var columnEnd = 2 - (columnIndex == 2)
			var rowBegin = 0 + (rowIndex == 0)
			var rowEnd = 2 - (rowIndex == 2)
			var quadrupleBegin = 4 * columnBegin
			var quadrupleEnd = 4 * columnEnd
			inverseMatrix[elementIndex] = originalMatrix[quadrupleBegin + rowBegin] * originalMatrix[quadrupleEnd + rowEnd]
			inverseMatrix[elementIndex] -= originalMatrix[quadrupleEnd + rowBegin] * originalMatrix[quadrupleBegin + rowEnd]
			if ((columnIndex + rowIndex) % 2 == 1) {
				inverseMatrix[elementIndex] = -inverseMatrix[elementIndex]
			}
		}
	}
	for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
		determinant += inverseMatrix[rowIndex] * originalMatrix[rowIndex]
	}
//	using 1.0 / determinant gives approximate matrix but exact point when inverted
	determinant = 1.0 / determinant
	for (var columnIndex = 0; columnIndex < 3; columnIndex++) {
		for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
			inverseMatrix[4 * columnIndex + rowIndex] *= determinant
		}
	}
	for (var step = 1; step < 4; step++) {
		var columnOriginal = step
		var rowOriginal = 0
		if (step == 3) {
			columnOriginal = 2
			rowOriginal = 1
		}
		var originalIndex = 4 * columnOriginal + rowOriginal
		var originalValue = inverseMatrix[originalIndex]
		var swapIndex = 4 * rowOriginal + columnOriginal
		inverseMatrix[originalIndex] = inverseMatrix[swapIndex]
		inverseMatrix[swapIndex] = originalValue
	}
	return inverseMatrix
}

function getMatrices3DByPath(points) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	if (points.length == 0) {
		return []
	}
	for (var vertexIndex = points.length - 2; vertexIndex > -1; vertexIndex--) {
		var point = points[vertexIndex]
		var nextPoint = points[vertexIndex + 1]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1] && point[2] == nextPoint[2]) {
			points.splice(vertexIndex, 1)
		}
	}
	if (points.length == 1) {
		return [getMatrix3DByTranslate(points[0])]
	}
	var vectors = new Array(points.length - 1)
	for (var pointIndex = 0; pointIndex < points.length - 1; pointIndex++) {
		vectors[pointIndex] = normalize3D(getSubtraction3D(points[pointIndex + 1], points[pointIndex]))
	}
	var matrices = new Array(points.length)
	var oldVector = vectors[0]
	matrices[0] = getMatrix3DByPair([0,0,1], oldVector)
	for (var vectorIndex = 1; vectorIndex < vectors.length; vectorIndex++) {
		var midpoint = getUnitMidpoint3D(oldVector, vectors[vectorIndex])
		matrices[vectorIndex] = getMultiplied3DMatrix(getMatrix3DByPair(oldVector, midpoint), matrices[vectorIndex - 1])
		oldVector = midpoint
	}
	matrices[matrices.length - 1] = getMatrix3DByPair(oldVector, vectors[vectors.length - 1])
	for (var matrixIndex = 1; matrixIndex < matrices.length; matrixIndex++) {
		addPointToMatrix3D(matrices[matrixIndex], points[matrixIndex])
	}
	return matrices
}

function getMatrices3DByStair(points) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var matrices = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		matrices[pointIndex] = getMatrix3DByTranslate(points[pointIndex])
	}
	return matrices
}

function getMatrix2DByPlane(floats) {
	var latestMatrix = getUnitMatrix2D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
	latestMatrix[4] = floats[0]
	if (floats.length == 1) {
		latestMatrix[5] = 0.0
	}
	else {
		latestMatrix[5] = floats[1]
	}
	if (floats.length < 3) {
		return latestMatrix
	}
	latestMatrix[0] = floats[2]
	latestMatrix[1] = floats[3]
	if (floats.length == 4) {
		latestMatrix[2] = -latestMatrix[1]
		latestMatrix[3] = latestMatrix[0]
	}
	else {
		latestMatrix[2] = floats[4]
		latestMatrix[3] = floats[5]
	}
	return latestMatrix
}

function getMatrix2DByPolar(floats) {
	var latestMatrix = getUnitMatrix2D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
	var rotation = floats[0] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
	latestMatrix[0] = cosAngle
	latestMatrix[1] = sinAngle
	latestMatrix[2] = -sinAngle
	latestMatrix[3] = cosAngle
	if (floats.length == 1) {
		return latestMatrix
	}
	var scale = floats[1]
	latestMatrix[0] *= scale
	latestMatrix[1] *= scale
	latestMatrix[2] *= scale
	latestMatrix[3] *= scale
	if (floats.length == 2) {
		return latestMatrix
	}
	latestMatrix[4] = floats[2]
	if (floats.length == 3) {
		return latestMatrix
	}
	latestMatrix[5] = floats[3]
	return latestMatrix
}

function getMatrix2DByRotate(floats) {
	if (floats.length == 0) {
		return getUnitMatrix2D()
	}
	var rotation = floats[0] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	cos -sin
//	sin cos
	var latestMatrix = [cosAngle, sinAngle, -sinAngle, cosAngle, 0.0, 0.0]
	if (floats.length < 2) {
		return latestMatrix
	}
	var x = 0.0
	var y = 0.0
	if (floats.length > 1) {
		x = floats[1]
	}
	if (floats.length > 2) {
		y = floats[2]
	}
	latestMatrix = getMultiplied2DMatrix(latestMatrix, [1.0, 0.0, 0.0, 1.0, -x, -y])
	return getMultiplied2DMatrix([1.0, 0.0, 0.0, 1.0, x, y], latestMatrix)
}

function getMatrix2DByScale(floats) {
	var latestMatrix = getUnitMatrix2D()
	if (floats.length == 0) {
		return latestMatrix
	}
	latestMatrix[0] = floats[0]
	if (floats.length > 1) {
		latestMatrix[3] = floats[1]
	}
	else {
		latestMatrix[3] = latestMatrix[0]
	}
	return latestMatrix
}

function getMatrix2DBySegment(beginPoint, endPoint) {
	var latestMatrix = getUnitMatrix2D()
//	a c e		0 2 4
//	b d f		1 3 5
	latestMatrix[4] = beginPoint[0]
	latestMatrix[5] = beginPoint[1]
	var subtraction = getSubtraction2D(endPoint, beginPoint)
	latestMatrix[0] = subtraction[0]
	latestMatrix[1] = subtraction[1]
	latestMatrix[2] = -subtraction[1]
	latestMatrix[3] = subtraction[0]
	return latestMatrix
}

function getMatrix2DBySegmentPortion(beginPoint, endPoint, scalePortion) {
	var latestMatrix = getMatrix2DBySegment(beginPoint, endPoint)
//	a c e		0 2 4
//	b d f		1 3 5
	if (getIsEmpty(scalePortion)) {
		return latestMatrix
	}
	var length = 0.0
	for (var index = 0; index < 4; index++) {
		length += latestMatrix[index] * latestMatrix[index]
	}
	length = Math.sqrt(length)
	if (length == 0.0) {
		return latestMatrix
	}
	var oneOverLength = 1.0 / length
	var lengthMinusOne = length - 1.0
	var xMultiplier = oneOverLength + oneOverLength * scalePortion[0] * lengthMinusOne
	latestMatrix[0] *= xMultiplier
	latestMatrix[1] *= xMultiplier
	var yMultiplier = oneOverLength + oneOverLength * scalePortion[1] * lengthMinusOne
	latestMatrix[2] *= yMultiplier
	latestMatrix[3] *= yMultiplier
	return latestMatrix
}

function getMatrix2DBySkewX(floats) {
	if (floats.length == 0) {
		return getUnitMatrix2D()
	}
	var rotation = floats[0] * gRadiansPerDegree
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 tan
//	0 1
	return [1.0, 0.0, Math.tan(rotation), 1.0, 0.0, 0.0]
}

function getMatrix2DBySkewY(floats) {
	if (floats.length == 0) {
		return getUnitMatrix2D()
	}
	var rotation = floats[0] * gRadiansPerDegree
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 0
//	tan 1
	return [1.0, Math.tan(rotation), 0.0, 1.0, 0.0, 0.0]
}

function getMatrix2DByTranslate(floats) {
	var latestMatrix = getUnitMatrix2D()
	if (floats.length == 0) {
		return latestMatrix
	}
	latestMatrix[4] = floats[0]
	if (floats.length > 1) {
		latestMatrix[5] = floats[1]
	}
	return latestMatrix
}

function getMatrix3DBy2D(matrix) {
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	return [matrix[0], matrix[1], 0.0, 0.0, matrix[2], matrix[3], 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, matrix[4], matrix[5], 0.0, 1.0]
}

function getMatrix3DByBasis(points) {
	var latestMatrix = getUnitMatrix3D()
	if (points.length < 2) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0 0		X	origin[0]
//	0 1 0 0		Y	origin[1]
//	0 0 1 0		XxY	origin[2]
//	0 0 0 1
//
	var x = points[0]
	var y = points[1]
	if (x.length < 3 || y.length < 3) {
		return latestMatrix
	}
	latestMatrix[0] = x[0]
	latestMatrix[1] = x[1]
	latestMatrix[2] = x[2]
	latestMatrix[4] = y[0]
	latestMatrix[5] = y[1]
	latestMatrix[6] = y[2]
	var product = crossProduct(x, y)
	latestMatrix[8] = product[0]
	latestMatrix[9] = product[1]
	latestMatrix[10] = product[2]
	if (points.length < 3) {
		return latestMatrix
	}
	var translate = points[2]
	latestMatrix[12] = translate[0]
	if (translate.length > 1) {
		latestMatrix[13] = translate[1]
	}
	if (translate.length > 2) {
		latestMatrix[14] = translate[2]
	}
	return latestMatrix
}

function getMatrix3DByPair(a, b) {
	var cos = dotProduct3D(a, b)
	var product = crossProduct(a, b)
	var sin = length3D(product)
	if (sin == 0.0) {
		return getUnitMatrix3D()
	}
	divide3DScalar(product, sin)
	return getMatrix3DByVectorCosSin([product[0], product[1], product[2], cos, sin])
}

function getMatrix3DByPerspective(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
	var z = floats[0]
	if (z == 0.0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0     0
//	0 1 0     0
//	0 0 1     0
//	0 0 -1/z  1
//
	latestMatrix[11] = -1.0 / z
	return latestMatrix
}

function getMatrix3DByPolar(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	cos		-sin	0 
//	sin		cos		0	
//	0		0		1	
	var rotation = floats[0] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
	latestMatrix[0] = cosAngle
	latestMatrix[1] = -sinAngle
	latestMatrix[4] = sinAngle
	latestMatrix[5] = cosAngle
	if (floats.length == 1) {
		return latestMatrix
	}
	var scale = floats[1]
	latestMatrix[0] *= scale
	latestMatrix[1] *= scale
	latestMatrix[4] *= scale
	latestMatrix[5] *= scale
	latestMatrix[10] *= scale
	if (floats.length == 2) {
		return latestMatrix
	}
	latestMatrix[12] = floats[2]
	if (floats.length == 3) {
		return latestMatrix
	}
	latestMatrix[13] = floats[3]
	if (floats.length == 4) {
		return latestMatrix
	}
	latestMatrix[14] = floats[4]
	return latestMatrix
}

function getMatrix3DByRotate3D(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length < 4) {
		return latestMatrix
	}
	var rotation = floats[3] * gRadiansPerDegree
	floats[3] = Math.cos(rotation)
	floats.length = 5
	floats[4] = Math.sin(rotation)
	return getMatrix3DByVectorCosSin(floats)
}

function getMatrix3DByRotateX(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cosAngle = Math.cos(rotation)
	sinAngle = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	1	0		0 
//	0	cos		-sin
//	0	sin		cos
	latestMatrix[5] = cosAngle
	latestMatrix[6] = -sinAngle
	latestMatrix[9] = sinAngle
	latestMatrix[10] = cosAngle
	return latestMatrix
}

function getMatrix3DByRotateY(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cosAngle = Math.cos(rotation)
	sinAngle = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	cos		0	sin
//	0		1	0
//	-sin	0	cos
	latestMatrix[0] = cosAngle
	latestMatrix[2] = -sinAngle
	latestMatrix[8] = sinAngle
	latestMatrix[10] = cosAngle
	return latestMatrix
}

function getMatrix3DByRotateZ(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cos = Math.cos(rotation)
	sin = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	cos		-sin	0 
//	sin		cos		0	
//	0		0		1	
	latestMatrix[0] = cos
	latestMatrix[1] = -sin
	latestMatrix[4] = sin
	latestMatrix[5] = cos
	return latestMatrix
}

function getMatrix3DByScale3D(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[0] = floats[0]
	latestMatrix[5] = latestMatrix[0]
	if (floats.length > 1) {
		latestMatrix[5] = floats[1]
	}
	latestMatrix[10] = latestMatrix[5]
	if (floats.length > 2) {
		latestMatrix[10] = floats[2]
	}
	return latestMatrix
}

function getMatrix3DByScaleX(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[0] = floats[0]
	return latestMatrix
}

function getMatrix3DByScaleY(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[5] = floats[0]
	return latestMatrix
}

function getMatrix3DByScaleZ(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[10] = floats[0]
	return latestMatrix
}

function getMatrix3DBySegment(beginPoint, endPoint) {
	var latestMatrix = getUnitMatrix3D()
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	if (beginPoint.length < 3) {
		beginPoint.push(0.0)
	}
	if (endPoint.length < 3) {
		endPoint.push(0.0)
	}
	latestMatrix[12] = beginPoint[0]
	latestMatrix[13] = beginPoint[1]
	latestMatrix[14] = beginPoint[2]
	var subtraction = getSubtraction3D(endPoint, beginPoint)
	latestMatrix[0] = subtraction[0]
	latestMatrix[1] = subtraction[1]
//	latestMatrix[2] = subtraction[2]
	latestMatrix[4] = -latestMatrix[1]
	latestMatrix[5] = latestMatrix[0]
//	latestMatrix[6] = latestMatrix[0]
	return latestMatrix
}

function getMatrix3DBySegmentPortion(beginPoint, endPoint, scalePortion) {
	var latestMatrix = getMatrix3DBySegment(beginPoint, endPoint)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	if (getIsEmpty(scalePortion)) {
		return latestMatrix
	}
	var length = 0.0
	for (var columnIndex = 0; columnIndex < 16; columnIndex += 4) {
		for (var rowIndex = 0; rowIndex < 4; rowIndex++) {
			var elementIndex = 4 * columnIndex + rowIndex
			length += latestMatrix[elementIndex] * latestMatrix[elementIndex]
		}
	}
	length = Math.sqrt(length)
	if (length == 0.0) {
		return latestMatrix
	}
	var oneOverLength = 1.0 / length
	var lengthMinusOne = length - 1.0
	var xMultiplier = oneOverLength + oneOverLength * scalePortion[0] * lengthMinusOne
	latestMatrix[0] *= xMultiplier
	latestMatrix[1] *= xMultiplier
	latestMatrix[2] *= xMultiplier
	var yMultiplier = oneOverLength + oneOverLength * scalePortion[1] * lengthMinusOne
	latestMatrix[4] *= yMultiplier
	latestMatrix[5] *= yMultiplier
	latestMatrix[6] *= yMultiplier
	var zMultiplier = oneOverLength + oneOverLength * scalePortion[2] * lengthMinusOne
	latestMatrix[8] *= zMultiplier
	latestMatrix[9] *= zMultiplier
	latestMatrix[10] *= zMultiplier
	return latestMatrix
}

function getMatrix3DByTranslate(floats) {
	return addPointToMatrix3D(getUnitMatrix3D(), floats)
}

function getMatrix3DByTranslateX(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[12] = floats[0]
	return latestMatrix
}

function getMatrix3DByTranslateY(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[13] = floats[0]
	return latestMatrix
}

function getMatrix3DByTranslateZ(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[14] = floats[0]
	return latestMatrix
}

function getMatrix3DByVectorCosSin(floats) {
	var latestMatrix = getUnitMatrix3D()
	if (floats.length < 5) {
		return latestMatrix
	}
	var x = floats[0]
	var y = floats[1]
	var z = floats[2]
	var cos = floats[3]
	var sin = floats[4]
	var t = 1.0 - cos
	var xs = x * sin
	var xt = x * t
	var ys = y * sin
	var yt = y * t
	var zs = z * sin
	var zt = z * t
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	https://en.wikipedia.org/wiki/Transformation_matrix#Rotation_2
//	c = cos		s = sin		t = 1 - cos
//
//	xtx + c		ytx - zs	ztx + ys
//	xty + zs	yty + c		zty - xs
//	xtz - ys	ytz + xs	ztz + c
//
	latestMatrix[0] = xt * x + cos
	latestMatrix[1] = xt * y + zs
	latestMatrix[2] = xt * z - ys
	latestMatrix[4] = yt * x - zs
	latestMatrix[5] = yt * y + cos
	latestMatrix[6] = yt * z + xs
	latestMatrix[8] = zt * x + ys
	latestMatrix[9] = zt * y - xs
	latestMatrix[10] = zt * z + cos
	return latestMatrix
}

function getMatrix3DRotatedBy2D(xyRotator) {
	var latestMatrix = getUnitMatrix3D()
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	cos		-sin	0 
//	sin		cos		0	
//	0		0		1	
	latestMatrix[0] = xyRotator[0]
	latestMatrix[1] = xyRotator[1]
	latestMatrix[4] = -xyRotator[1]
	latestMatrix[5] = xyRotator[0]
	return latestMatrix
}

function getMidpoint2D(a2D, b2D) {
	return multiply2DScalar(getAddition2D(a2D, b2D), 0.5)
}

function getMidpoint3D(a3D, b3D) {
	return multiply3DScalar(getAddition3D(a3D, b3D), 0.5)
}

function getMidpointArray(elements, others, until) {
	return multiplyArrayScalar(getAdditionArray(elements, others, until), 0.5)
}

function getMultiplied2DMatrix(matrixA, matrixB) {
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	row by column into row, colum
//	[0 2 4] x [0 1  ] = '0,0 2,1' > a > 0
//	[1 3 5] x [0 1  ] = '1,0 3,1' > b > 1
//	[0 2 4] x [2 3  ] = '0,2 2,3' > c > 2
//	[1 3 5] x [2 3  ] = '1,2 3,3' > d > 3
//	[0 2 4] x [4 5 +] = '0,4 2,5 4,' > e > 4
//	[1 3 5] x [4 5 +] = '1,4 3,5 5,' > f > 5
	var a = matrixA[0] * matrixB[0] + matrixA[2] * matrixB[1]
	var b = matrixA[1] * matrixB[0] + matrixA[3] * matrixB[1]
	var c = matrixA[0] * matrixB[2] + matrixA[2] * matrixB[3]
	var d = matrixA[1] * matrixB[2] + matrixA[3] * matrixB[3]
	var e = matrixA[0] * matrixB[4] + matrixA[2] * matrixB[5] + matrixA[4]
	var f = matrixA[1] * matrixB[4] + matrixA[3] * matrixB[5] + matrixA[5]
	return [a, b, c, d, e, f]
}

function getMultiplied3DMatrix(mA, mB) {
	var multiplied3D = getUnitMatrix3D()
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	row by column into row, colum
//	[0 4 8 12] x [0 1 2 3] = '0,0 4,1 8,2 12,3' > 0
//	[1 5 9 13] x [0 1 2 3] = '1,0 5,1 9,2 13,3' > 1
//	[2 6 10 14] x [0 1 2 3] = '2,0 6,1 10,2 14,3' > 2
//	[3 7 11 15] x [0 1 2 3] = '3,0 7,1 11,2 15,3' > 3
//	[0 4 8 12] x [4 5 6 7] = '0,4 4,5 8,6 12,7' > 4
	for (var columnIndex = 0; columnIndex < 16; columnIndex += 4) {
		for (var rowIndex = 0; rowIndex < 4; rowIndex++) {
			var element = mA[rowIndex] * mB[columnIndex]
			element += mA[rowIndex + 4] * mB[columnIndex + 1]
			element += mA[rowIndex + 8] * mB[columnIndex + 2]
			element += mA[rowIndex + 12] * mB[columnIndex + 3]
			multiplied3D[columnIndex + rowIndex] = element
		}
	}
	return multiplied3D
}

function getNewlineMatrixString(matrix, numberOfRows) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var rowStrings = []
	for (rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
		var columnStrings = []
		for (columnIndex = 0; columnIndex < matrix.length; columnIndex += numberOfRows) {
			columnStrings.push(matrix[columnIndex + rowIndex].toFixed(3))
		}
		rowStrings.push(columnStrings.join(','))
	}
	return rowStrings.join('\n')
}

function getNormalizedBisector(centerBegin2D, centerEnd2D) {
	var bisector = getAddition2D(centerBegin2D, centerEnd2D)
	var bisectorLength = length2D(bisector)
	if (bisectorLength == 0.0) {
		return [centerEnd2D[1], -centerEnd2D[0]]
	}
	return divide2DScalar(bisector, bisectorLength)
}

function getNormalizedBisectorByBeginCenterEnd(beginPoint, centerPoint, endPoint) {
	return getNormalizedBisector(getSubtraction2D(beginPoint, centerPoint), getSubtraction2D(endPoint, centerPoint))
}

function getPositiveModulo(x) {
	return x - Math.floor(x)
}

function getRelativeDirection(vector) {
	var absoluteX = Math.abs(vector[0])
	if (vector[1] > absoluteX) {
		return 6.06 + vector[0] / vector[1]
	}
	if (vector[1] < -absoluteX) {
		return 2.02 + vector[0] / vector[1]
	}
	var absoluteY = Math.abs(vector[1])
	if (vector[0] > absoluteY) {
		return -vector[1] / vector[0]
	}
	return 4.04 -vector[1] / vector[0]
}

function getRGB() {
	gRGBIndex += 1
	return getRGBByIndex(gRGBIndex)
}

function getRGBByIndex(rgbIndex) {
	return [getBrightness256(rgbIndex * 0.617), getBrightness256(rgbIndex * 0.733), getBrightness256(rgbIndex * 0.317)]
}

function getTransformed2DPointsByMatrix3Ds(polygon, matrix2Ds) {
	if (getIsEmpty(matrix2Ds)) {
		return [polygon]
	}
	var transformedPolygons = []
	for (var matrix2D of matrix2Ds) {
		transformedPolygons.push(transform2DPoints(matrix2D, getArraysCopy(polygon)))
	}
	return transformedPolygons
}

function getUnitMatrix2D() {
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 0 0
//	0 1 0
	return [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
}

function getUnitMatrix3D() {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0 0
//	0 1 0 0
//	0 0 1 0
//	0 0 0 1
	return [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]
}

function getUnitMidpoint3D(a3D, b3D) {
	return normalize3D(getMidpoint3D(a3D, b3D))
}

function invert3D(xyz) {
	xyz[0] = -xyz[0]
	xyz[1] = -xyz[1]
	xyz[2] = -xyz[2]
	return xyz
}

function isUnitMatrix(matrix) {
	if (matrix.length == 6) {
		return isUnitMatrix2D(matrix)
	}
	if (matrix.length == 16) {
		return isUnitMatrix3D(matrix)
	}
	return false
}

function isUnitMatrix2D(matrix2D) {
	return arrayIsClose(matrix3D, gUnitMatrix2D)
}

function isUnitMatrix3D(matrix3D) {
	return arrayIsClose(matrix3D, gUnitMatrix3D)
}

function multiply2DArrays(xyArrays, b2D) {
	for (var xys of xyArrays) {
		multiply2Ds(xys, b2D)
	}
	return xyArrays
}

function multiply2DArraysByScalar(xyArrays, multiplier) {
	for (var xys of xyArrays) {
		multiply2DsByScalar(xys, multiplier)
	}
	return xyArrays
}

function multiply2Ds(xys, b2D) {
	for (var xy of xys) {
		multiply2D(xy, b2D)
	}
	return xys
}

function multiply2DsByScalar(xys, multiplier) {
	for (var xy of xys) {
		xy[0] *= multiplier
		xy[1] *= multiplier
	}
	return xys
}

function multiply3DArraysByScalar(xyzArrays, multiplier) {
	for (var xyzs of xyzArrays) {
		multiply3DsByScalar(xyzs, multiplier)
	}
	return xyzArrays
}

function multiply3DsByScalar(xyzs, multiplier) {
	for (var xyz of xyzs) {
		xyz[0] *= multiplier
		xyz[1] *= multiplier
		xyz[2] *= multiplier
	}
	return xyzs
}

function multiplyArrayArraysByIndex(arrayArrays, multiplier, index) {
	for (var arrays of arrayArrays) {
		multiplyArraysByIndex(arrays, multiplier, index)
	}
	return arrayArrays
}

function multiplyArraysByIndex(arrays, multiplier, index) {
	for (var array of arrays) {
		array[index] *= multiplier
	}
	return arrays
}

function normalize2D(xy) {
	var xyLength = length2D(xy)
	if (xyLength > 0.0) {
		divide2DScalar(xy, xyLength)
	}
	return xy
}

function normalize3D(xyz) {
	var xyzLength = length3D(xyz)
	if (xyzLength > 0.0) {
		divide3DScalar(xyz, xyzLength)
	}
	return xyz
}

function rotate3DByBasis(rotationBasis, xyz, xyRotator) {
	var basis0 = rotationBasis[0]
	var basis1 = rotationBasis[1]
	var xyzBasis0 = xyz[basis0]
	xyz[basis0] = xyz[basis0] * xyRotator[0] - xyz[basis1] * xyRotator[1]
	xyz[basis1] = xyzBasis0 * xyRotator[1] + xyz[basis1] * xyRotator[0]
}

function rotate3DsByBasis(rotationBasis, xyzs, xyRotator) {
	for (var xyz of xyzs) {
		rotate3DByBasis(rotationBasis, xyz, xyRotator)
	}
}

function transform2DPoint(matrix2D, point) {
	originalX = point[0]
//	a c e		0 2 4
//	b d f		1 3 5
	point[0] = point[0] * matrix2D[0] + point[1] * matrix2D[2] + matrix2D[4]
	point[1] = originalX * matrix2D[1] + point[1] * matrix2D[3] + matrix2D[5]
}

function transform2DPoints(matrix2D, points) {
	for (var point of points) {
		transform2DPoint(matrix2D, point)
	}
	return points
}

function transform2DOr3DPoints(matrix, points) {
	if (matrix.length == 6) {
		transform2DPoints(matrix, points)
		return
	}
	if (matrix.length == 16) {
		transform3DPoints(matrix, points)
	}
}

function transform3DPoints(matrix3D, points) {
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		points[pointIndex] = get3DBy3DMatrix(matrix3D, points[pointIndex])
	}
}

function widenBoundingBox(boundingBox, point) {
	var minimumIndex = Math.min(boundingBox[0].length, point.length)
	for (var parameterIndex = 0; parameterIndex < minimumIndex; parameterIndex++) {
		boundingBox[0][parameterIndex] = Math.min(boundingBox[0][parameterIndex], point[parameterIndex])
		boundingBox[1][parameterIndex] = Math.max(boundingBox[1][parameterIndex], point[parameterIndex])
	}
}

var g2DTransformMap = new Map([
	['matrix', getFloats],
	['rotate', getMatrix2DByRotate],
	['scale', getMatrix2DByScale],
	['skewX', getMatrix2DBySkewX],
	['skewY', getMatrix2DBySkewY],
	['translate', getMatrix2DByTranslate]])
var g3DMatricesMap = new Map([
	['path', getMatrices3DByPath],
	['stair', getMatrices3DByStair]])
var g3DPointTransformMap = new Map([
	['basis', getMatrix3DByBasis]])
var g3DTransformMap = new Map([
	['matrix', getFloats],
	['perspective', getMatrix3DByPerspective],
	['rotate', getMatrix3DByRotate3D],
	['rotateX', getMatrix3DByRotateX],
	['rotateY', getMatrix3DByRotateY],
	['rotateZ', getMatrix3DByRotateZ],
	['scale', getMatrix3DByScale3D],
	['scaleX', getMatrix3DByScaleX],
	['scaleY', getMatrix3DByScaleY],
	['scaleZ', getMatrix3DByScaleZ],
	['translate', getMatrix3DByTranslate],
	['translateX', getMatrix3DByTranslateX],
	['translateY', getMatrix3DByTranslateY],
	['translateZ', getMatrix3DByTranslateZ]])
var gUnitMatrix2D = getUnitMatrix2D()
var gUnitMatrix3D = getUnitMatrix3D()





/*
abstract date=22.07.14 flipY=3 project=Antenna skip2D=true{
default id=_default fillet=sides:12

var antennaHeight=19 back=208 clipHalfWidth=21/2 crossHeight=50 crossHalfwidth=95 directorSpacing=136.3 gap=0.7 holeRadius=1.5 inset=4 ridgeWidth=4 sideThickness=4 slotHeight=4 slotInset=1 smoothLength=14 springThickness=2 stemHalfwidth=22 stopperBack=12 stopperBackInset=10 toothPeakAlong=0.4 top=15 wedgeHalfWidth=7

var clipBack=136+stopperBack clipFront=68+stopperBack crossFront=back-crossHeight filletRadius=1.5*inset floor1=top/3 halfInset=inset/2 halfSpringThickness=springThickness/2 holeRadiusGap=holeRadius+gap quarterInset=inset/4 slotPeak=slotHeight+2 springBaseThickness=1.4*springThickness stopperTop=top+top toothOuter=(1.0-toothPeakAlong)*smoothLength

var centerStopperFront=149+halfInset centerRidgeBack=back-halfInset-1 centerRidgeFront=crossFront+halfInset+1 floor2=top-halfInset forkThickness=slotPeak+sideThickness holeRadiusPlus=holeRadiusGap+sideThickness rightHeight=crossHeight+sideThickness slotRight=crossHalfwidth-2*slotInset-filletRadius smoothInner=stemHalfwidth+filletRadius+1 springBetweenThickness=(springThickness+springBaseThickness)/2 toothHeight=toothPeakAlong*halfInset

var centerRidgeBackBend=centerRidgeBack-2 centerRidgeFrontBend=centerRidgeFront+2*slotInset centerRidgeRight=slotRight-gap-slotInset forkToothThickness=forkThickness+gap rightHeightMinus=rightHeight-halfInset smoothSlotInner=smoothInner+2 toothBottom=toothOuter+sideThickness toothTop=rightHeight-toothOuter topRidgeFront=rightHeight-halfInset-1

var centerRidgeLeft=centerRidgeRight-ridgeWidth forkTop=2*forkToothThickness+top rightStart=smoothSlotInner+gap smoothSlotOuter=smoothSlotInner+12

var holeX=directorSpacing-rightStart holeY=forkTop/2+top/2+antennaHeight/2 slotLeft=centerRidgeLeft-gap-slotInset

var antennaRightBack=holeY+holeRadiusPlus barRight=slotLeft-filletRadius-slotInset-rightStart smoothOuter=slotLeft-3 squareRight=crossHalfwidth+gap/4-rightStart squareTop=forkTop-forkThickness toothRight=smoothSlotOuter-gap-rightStart

var antennaRightWidth=holeX+holeRadius+sideThickness barLeft=barRight-sideThickness riseBegin=slotRight+slotInset-rightStart riseEnd=squareRight+1

var springBetweenX=0.75*barLeft

window transform3D=basis(x y) id=topView transform=translate(border(),-border()-topByID()){

sculpture alterations=bevel,view bevels=inset id=antennaCenter stratas=-1,1 {
mirrorJoin alterations=fillet id=centerPolygon radius=filletRadius points=,back smoothInner, smoothOuter, crossHalfwidth, ,crossFront smoothOuter, smoothInner, stemHalfwidth, ,stopperBack ,0 -stemHalfwidth,
layer heights=0,floor1 id=centerBase {
copy work=centerPolygon
}
layer heights=floor2,top {
copy work=centerPolygon
mirrorJoin points=-clipHalfWidth-slotInset,clipFront-10 clipHalfWidth+slotInset, ,clipBack+slotInset+halfInset
}
layer heights=stopperTop-halfInset,stopperTop {
mirrorJoin alterations=fillet radius=filletRadius points=-stemHalfwidth, ,stopperBack*0.7 stopperBackInset-stemHalfwidth,stopperBack stemHalfwidth-stopperBackInset,
}
}
bevel bevels=halfInset stratas=top-1,top+1 work=antennaCenter {
rectangle points=-crossHalfwidth-1,stopperBack+1 crossHalfwidth+2,back+2
}
bevel bevels=halfInset stratas=stopperTop-1,stopperTop+1 work=antennaCenter {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}

pillar heights=0,slotHeight/2,slotHeight id=centerRidge {
mirrorJoin points=centerRidgeLeft+quarterInset,centerRidgeFront centerRidgeLeft,centerRidgeFrontBend ,centerRidgeBackBend centerRidgeLeft+quarterInset,centerRidgeBack centerRidgeRight-quarterInset,
}
bend amplitudes=0,slotHeight stratas=slotHeight-1,slotHeight+1 work=centerRidge {
rectangle points=slotLeft,centerRidgeFront-1 slotRight,centerRidgeFrontBend+1
}
bend amplitudes=0,-slotHeight stratas=slotHeight-1,slotHeight+1 work=centerRidge {
rectangle points=slotLeft,centerRidgeBackBend-1 slotRight,centerRidgeBack+1
}

emboss tools=centerRidge work=antennaCenter {
matrix2D planes=, -centerRidgeLeft-centerRidgeRight,
}
bend amplitudes=0,0,0,-halfInset stratas=-1,floor2-1 work=antennaCenter {
rectangle id=stemRectangle points=stemHalfwidth-inset-1,-1 stemHalfwidth+1,crossFront+filletRadius
}
bend amplitudes=0,0,0,halfInset stratas=-1,floor2-1 work=antennaCenter {
copy alterations=mirror direction=90 work=stemRectangle
}

mirrorJoin display=none id=centerSlotPolygon points=slotLeft,-1 ,slotHeight+quarterInset/2 slotLeft+quarterInset,slotPeak slotRight-quarterInset,

polygon id=aroundCorner points=holeX-holeRadiusPlus,antennaRightBack antennaRightWidth, antennaRightWidth,holeY-holeRadiusPlus+2 slotRight+sideThickness-rightStart,0

g transform=translate(rightStart,crossFront) {
sculpture alterations=view id=antennaRight {
layer heights=0,sideThickness {
polygon alterations=fillet points=slotLeft-sideThickness-rightStart,0 barLeft,forkThickness-springBaseThickness springBetweenX,forkThickness-springBetweenThickness 0,forkThickness-springThickness ,forkThickness toothRight, toothRight+sideThickness, barLeft, ,forkTop-forkThickness mirrorJoin() pointsByID(aroundCorner) radius=filletRadius
rectangle alterations=fillet clockwise=false points=barRight,forkThickness squareRight,forkTop-forkThickness radius=filletRadius
}
layer heights=rightHeight {
polygon alterations=fillet points=slotLeft-sideThickness-rightStart, barLeft,forkThickness-springBaseThickness springBetweenX,forkThickness-springBetweenThickness 0,forkThickness-springThickness ,forkThickness toothRight, toothRight+sideThickness, squareRight, ,squareTop mirrorJoin() pointsByID(aroundCorner) radius=filletRadius
}
}

}

rectangle id=backSplitRectangle points=-1,forkTop/2 toothRight+sideThickness/2,forkTop-forkThickness+halfSpringThickness
split splitHeights=toothBottom,smoothLength+sideThickness,rightHeight-smoothLength,toothTop work=antennaRight {
copy work=backSplitRectangle
}
bend amplitudes=0,0 toothBottom,-gap-toothHeight smoothLength+sideThickness,-gap rightHeight-smoothLength,-gap toothTop,-gap-toothHeight rightHeight,0 splitIDs=backSplit stratas=toothBottom-gap,toothTop+gap vector=z work=antennaRight {
copy work=backSplitRectangle
}

rectangle id=frontSplitRectangle points=-1,forkThickness-halfSpringThickness toothRight+sideThickness/2,forkTop/2
split splitHeights=toothBottom,toothTop work=antennaRight {
copy work=frontSplitRectangle
}
bend amplitudes=0,gap stratas=toothBottom-1,toothTop+1 vector=z work=antennaRight {
copy work=frontSplitRectangle
}

difference id=rightSlot splitInsides=halfInset work=antennaRight {
copy transform=translate(-rightStart,squareTop) work=centerSlotPolygon
}
bevel bevels=-1,0 splitIDs=rightSlot work=antennaRight

pillar heights=-slotHeight,-slotHeight/2,0 id=rightRidge {
mirrorJoin display=none points=centerRidgeLeft-rightStart+quarterInset,topRidgeFront centerRidgeLeft-rightStart,topRidgeFront-halfInset ,0 centerRidgeRight-rightStart,
}
bend amplitudes=0,-slotHeight stratas=-slotHeight-1,-slotHeight/2-1 work=rightRidge {
rectangle points=slotLeft-rightStart,topRidgeFront-halfInset-1 slotRight-rightStart,topRidgeFront+1
}

bend amplitudes=0,0,-(stopperTop-halfInset-top)/2 stopperBack,0,0 stratas=stopperTop-halfInset-1,stopperTop+1 vector=y work=antennaCenter {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}

}

window transform3D=basis(x z) id=frontView transform=translate(border(),-border()-border()-topByID(topView)-topByID()) {

emboss bottomTools=rightRidge stratas=-forkTop/2,0 work=antennaRight

difference id=centerSlot splitInsides=inset+quarterInset work=antennaCenter {
copy work=centerSlotPolygon
matrix2D planes=, -slotLeft-slotRight,
}

bevel bevels=-1,0 splitIDs=centerSlot work=antennaCenter

}

window transform3D=basis(y z) id=rightView transform=translate(border()+border()+rightByID(topView),-border()-topByID(topView)) scale(1,-1) rotate(-90){

difference work=antennaCenter {
polygon points=crossFront-20,-2 crossFront-15,3 crossFront-8,3 crossFront-7,2 crossFront-5,-2
}

split splitHeights=-smoothSlotOuter,-smoothSlotInner,smoothSlotInner,smoothSlotOuter work=antennaCenter {
rectangle points=crossFront-filletRadius,top-1 back+filletRadius,top+1
}

split id=closeToSlot splitHeights=riseEnd,riseBegin stratas=-1,toothRight work=antennaRight {
rectangle display=none points=forkTop-forkThickness-1,rightHeight-1 forkTop-forkThickness,rightHeight+1
}

}

window transform3D=basis(x y) id=topViewCopy transform=translate(border(),-border()-topByID(topView)) {

bevel bevels=smoothLength-halfInset stratas=top-1,top+1 work=antennaCenter {
rectangle id=smoothSlope points=smoothInner+1,crossFront-1 smoothSlotOuter+1,back+1
copy alterations=mirror direction=90 work=smoothSlope
}

difference id=centerHole splitInsides=halfInset work=antennaCenter {
regulon cx=0 cy=back-inset-wedgeHalfWidth+quarterInset-inset r=wedgeHalfWidth+slotInset
polygon points=smoothOuter-1,back-halfInset-1-5 ,crossFront+halfInset+1+5 smoothOuter-9,(crossFront+back)/2
}
bevel bevels=-slotInset splitIDs=centerHole work=antennaCenter

bend amplitudes=riseBegin,0,0 riseEnd,0,10 splitIDs=closeToSlot stratas=rightHeight-1,rightHeight+1 work=antennaRight {
rectangle points=riseBegin,-1 antennaRightWidth+1,antennaRightBack+1
}

_difference id=hole splitInsides=halfInset work=antennaRight {
polygon alterations=fillet points=riseEnd+sideThickness,forkTop-2 riseEnd+sideThickness,forkThickness holeX-holeRadiusPlus,holeY-holeRadiusGap-1.5 ,holeY+holeRadiusGap-1.5 radius=filletRadius
regulon cx=holeX cy=holeY r=holeRadiusGap+slotInset
}
bevel bevels=-slotInset splitIDs=hole work=antennaRight

move alterations=stl,polygonAnalysis,triangleAnalysis bedSize=250,210 rotation=90 id=antenna_center work=antennaCenter

copy alterations=mirror,move,stl,view bedSize=180 direction=90 id=antenna_left output=antenna_left work=antennaRight

move alterations=stl bedSize=180 id=antenna_right work=antennaRight

}
*/
