import pickle
import os
from collections import Counter
from typing import Dict, Tuple, Any, Optional, List
import json

class RLECompressor:
    """
    Run-Length Encoding (RLE) Compression Algorithm
    
    Run-Length Encoding is a simple lossless data compression algorithm that stores 
    sequences of identical consecutive data values as a single data value and count.
    Instead of storing "AAABBBCCCC", it stores "A3B3C4".
    
    How it works:
    1. Scan through the input data sequentially
    2. Count consecutive occurrences of each byte/character
    3. Store as pairs: (value, count) or (count, value)
    4. Replace runs with compressed representation
    
    Benefits:
    - Very simple algorithm with minimal overhead
    - Excellent for data with long runs of identical values
    - Fast compression and decompression
    - Low memory requirements
    
    Best for: Images with large solid areas, simple graphics, bitmap images,
              data with repetitive patterns
    Not ideal for: Text files, complex images, random data, already compressed files
    
    Note: RLE can actually increase file size if data has few consecutive repetitions
    """
    
    def __init__(self, threshold: int = 3):
        """
        Initialize RLE compressor
        
        Args:
            threshold: Minimum run length to compress (default: 3)
                      Runs shorter than this are stored uncompressed
        """
        self.threshold = threshold
        self.stats = {}
    
    def _encode_runs(self, data: bytes) -> List[Tuple[bool, int, bytes]]:
        """
        Encode data into runs
        
        Returns:
            List of tuples: (is_compressed, length, data)
            - is_compressed: True if this segment is RLE compressed
            - length: Length of the run or literal segment
            - data: The actual byte value (for runs) or literal data
        """
        if not data:
            return []
        
        runs = []
        i = 0
        
        while i < len(data):
            current_byte = data[i]
            run_length = 1
            
            # Count consecutive identical bytes
            while i + run_length < len(data) and data[i + run_length] == current_byte:
                run_length += 1
            
            if run_length >= self.threshold:
                # Store as compressed run: (True, count, byte_value)
                runs.append((True, run_length, bytes([current_byte])))
                i += run_length
            else:
                # Collect literal bytes (non-repeating or short runs)
                literal_start = i
                i += run_length
                
                # Continue collecting literals until we hit a compressible run
                while i < len(data):
                    next_byte = data[i]
                    next_run_length = 1
                    
                    # Check if next sequence is compressible
                    while i + next_run_length < len(data) and data[i + next_run_length] == next_byte:
                        next_run_length += 1
                    
                    if next_run_length >= self.threshold:
                        break  # Found compressible run, stop collecting literals
                    
                    i += next_run_length
                
                # Store literal segment
                literal_data = data[literal_start:i]
                runs.append((False, len(literal_data), literal_data))
        
        return runs
    
    def _encode_to_bytes(self, runs: List[Tuple[bool, int, bytes]]) -> bytes:
        """
        Convert run data to byte format for storage
        
        Format:
        - Compressed run: [FLAG_COMPRESSED][COUNT_BYTES][VALUE]
        - Literal segment: [FLAG_LITERAL][LENGTH_BYTES][LITERAL_DATA]
        
        Uses variable-length encoding for counts/lengths
        """
        result = bytearray()
        
        for is_compressed, length, data in runs:
            if is_compressed:
                # Compressed run format: 0xFF (flag) + count + value
                result.append(0xFF)  # Compression flag
                result.extend(self._encode_length(length))
                result.extend(data)
            else:
                # Literal segment format: 0xFE (flag) + length + data
                result.append(0xFE)  # Literal flag
                result.extend(self._encode_length(length))
                result.extend(data)
        
        return bytes(result)
    
    def _encode_length(self, length: int) -> bytes:
        """
        Encode length using variable-length encoding
        
        Uses 1-4 bytes depending on value:
        - 0-254: 1 byte
        - 255-65534: 2 bytes (255 + 2 bytes)
        - 65535+: 4 bytes (255 + 255 + 4 bytes)
        """
        if length < 255:
            return bytes([length])
        elif length < 65535:
            return bytes([255, length & 0xFF, (length >> 8) & 0xFF])
        else:
            return bytes([255, 255, 
                         length & 0xFF, (length >> 8) & 0xFF,
                         (length >> 16) & 0xFF, (length >> 24) & 0xFF])
    
    def _decode_length(self, data: bytes, offset: int) -> Tuple[int, int]:
        """
        Decode variable-length encoded length
        
        Returns:
            Tuple of (length, bytes_consumed)
        """
        if data[offset] < 255:
            return data[offset], 1
        elif data[offset + 1] < 255:
            length = data[offset + 1] | (data[offset + 2] << 8)
            return length, 3
        else:
            length = (data[offset + 2] | (data[offset + 3] << 8) |
                     (data[offset + 4] << 16) | (data[offset + 5] << 24))
            return length, 6
    
    def compress(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """
        Compress a file using Run-Length Encoding
        
        Args:
            input_file: Path to input file
            output_file: Path to compressed output file
            
        Returns:
            Dictionary with compression statistics
        """
        # Read input file
        with open(input_file, 'rb') as f:
            data = f.read()
        
        if not data:
            raise ValueError("Input file is empty")
        
        original_size = len(data)
        
        # Analyze data for statistics
        byte_counts = Counter(data)
        
        # Encode into runs
        runs = self._encode_runs(data)
        
        # Convert to bytes
        compressed_data = self._encode_to_bytes(runs)
        
        # Calculate statistics
        total_runs = sum(1 for is_comp, _, _ in runs if is_comp)
        total_literals = sum(1 for is_comp, _, _ in runs if not is_comp)
        total_run_bytes = sum(length for is_comp, length, _ in runs if is_comp)
        
        # Save compressed file with metadata
        compression_data = {
            'compressed_data': compressed_data,
            'original_size': original_size,
            'threshold': self.threshold,
            'runs_count': total_runs,
            'literal_segments': total_literals
        }
        
        with open(output_file, 'wb') as f:
            pickle.dump(compression_data, f)
        
        compressed_size = os.path.getsize(output_file)
        compression_ratio = original_size / compressed_size if compressed_size > 0 else 0
        
        self.stats = {
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio,
            'space_saved': ((original_size - compressed_size) / original_size) * 100,
            'total_runs': total_runs,
            'total_literals': total_literals,
            'run_bytes_saved': total_run_bytes - (total_runs * 3),  # Approximate overhead
            'unique_bytes': len(byte_counts),
            'most_common_byte': byte_counts.most_common(1)[0] if byte_counts else None
        }
        
        return self.stats
    
    def decompress(self, compressed_file: str, output_file: str) -> Dict[str, Any]:
        """
        Decompress an RLE encoded file
        Args:
            compressed_file: Path to compressed file
            output_file: Path to decompressed output file
        Returns:
            Dictionary with decompression statistics
        """
        # Check if file is actually an RLE-compressed file
        with open(compressed_file, 'rb') as f:
            header = f.read(10)
            
        # Check for PNG signature
        if header.startswith(b'\x89PNG'):
            raise ValueError(f"File {compressed_file} is a PNG image, not an RLE-compressed file")
        
        # Check for other common file types
        if header.startswith(b'JFIF') or header.startswith(b'\xff\xd8'):
            raise ValueError(f"File {compressed_file} is a JPEG image, not an RLE-compressed file")
        
        # Check for pickle protocol headers
        if not (header.startswith(b'\x80\x03') or header.startswith(b'\x80\x04') or header.startswith(b'\x80\x05')):
            raise ValueError(f"File {compressed_file} does not appear to be a pickle file (expected RLE format)")
        
        # Continue with your existing decompression logic...
        with open(compressed_file, 'rb') as f:
            unpickler = pickle.Unpickler(f)
            unpickler.persistent_load = self.persistent_load
            compression_data = unpickler.load()
        
        compressed_data = compression_data['compressed_data']
        original_size = compression_data['original_size']
        
        # Rest of your decompression logic remains the same...
        decoded_data = bytearray()
        i = 0
        actual_runs = 0
        actual_literals = 0
        
        while i < len(compressed_data):
            flag = compressed_data[i]
            i += 1
            if flag == 0xFF:  # Compressed run
                length, consumed = self._decode_length(compressed_data, i)
                i += consumed
                value = compressed_data[i]
                i += 1
                decoded_data.extend([value] * length)
                actual_runs += 1
            elif flag == 0xFE:  # Literal segment
                length, consumed = self._decode_length(compressed_data, i)
                i += consumed
                literal_data = compressed_data[i:i + length]
                i += length
                decoded_data.extend(literal_data)
                actual_literals += 1
            else:
                raise ValueError(f"Invalid flag byte: {flag:02x} at position {i-1}")
        
        # Write decompressed file
        with open(output_file, 'wb') as f:
            f.write(bytes(decoded_data))
        
        # Calculate basic decompression statistics
        decompressed_size = len(decoded_data)
        self.stats = {
            'original_size': original_size,
            'decompressed_size': decompressed_size,
            'success': decompressed_size == original_size,
            'runs_processed': actual_runs,
            'literal_segments_processed': actual_literals
        }
        
        return self.stats
    def get_compression_info(self) -> Dict[str, Any]:
        """Get detailed information about the compression"""
        if not self.stats:
            return {}
        
        info = {
            'threshold_used': self.threshold,
            'compression_efficiency': self.stats.get('space_saved', 0),
            'runs_created': self.stats.get('total_runs', 0),
            'literal_segments': self.stats.get('total_literals', 0),
            'unique_byte_values': self.stats.get('unique_bytes', 0)
        }
        
        if self.stats.get('most_common_byte'):
            byte_val, count = self.stats['most_common_byte']
            info['most_frequent_byte'] = {
                'value': f'\\x{byte_val:02x}' if byte_val < 32 or byte_val > 126 else chr(byte_val),
                'count': count,
                'percentage': (count / self.stats['original_size']) * 100
            }
        
        return info
    
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a file to predict RLE compression effectiveness
        
        Args:
            file_path: Path to file to analyze
            
        Returns:
            Analysis results with compression predictions
        """
        with open(file_path, 'rb') as f:
            data = f.read()
        
        if not data:
            return {'error': 'File is empty'}
        
        # Find all runs of different lengths
        run_analysis = {i: 0 for i in range(2, 11)}  # Runs of length 2-10
        run_analysis['11+'] = 0
        
        i = 0
        total_compressible_bytes = 0
        
        while i < len(data):
            current_byte = data[i]
            run_length = 1
            
            while i + run_length < len(data) and data[i + run_length] == current_byte:
                run_length += 1
            
            if run_length >= 2:
                if run_length <= 10:
                    run_analysis[run_length] += 1
                else:
                    run_analysis['11+'] += 1
                
                if run_length >= self.threshold:
                    total_compressible_bytes += run_length
            
            i += run_length
        
        byte_frequency = Counter(data)
        
        return {
            'file_size': len(data),
            'unique_bytes': len(byte_frequency),
            'run_distribution': run_analysis,
            'estimated_compressible_bytes': total_compressible_bytes,
            'estimated_compression_ratio': total_compressible_bytes / len(data),
            'top_5_bytes': [
                {
                    'byte': f'\\x{b:02x}' if b < 32 or b > 126 else chr(b),
                    'count': c,
                    'percentage': (c / len(data)) * 100
                }
                for b, c in byte_frequency.most_common(5)
            ],
            'recommendation': self._get_recommendation(run_analysis, len(data))
        }
    
    def _get_recommendation(self, run_analysis: Dict, file_size: int) -> str:
        """Generate recommendation based on analysis"""
        total_runs = sum(count for length, count in run_analysis.items() 
                        if isinstance(length, int) and length >= self.threshold)
        total_runs += run_analysis.get('11+', 0)
        
        if total_runs == 0:
            return "RLE not recommended - no compressible runs found"
        elif total_runs < file_size * 0.1:
            return "RLE may increase file size - few compressible runs"
        elif total_runs < file_size * 0.3:
            return "RLE may provide modest compression"
        else:
            return "RLE should provide good compression - many repetitive sequences found"

def compress_file_RLE(input_path: str, output_path: str = None, threshold: int = 3) -> Dict[str, Any]:
    """
    Convenience function to compress any file using RLE
    
    Args:
        input_path: Path to file to compress
        output_path: Output path (optional)
        threshold: Minimum run length to compress
    
    Returns:
        Compression statistics
    """
    if output_path is None:
        output_path = input_path + '.rle'
    
    compressor = RLECompressor(threshold=threshold)
    stats = compressor.compress(input_path, output_path)
    compression_info = compressor.get_compression_info()
    
    return {**stats, 'compression_info': compression_info}

def decompress_file_RLE(compressed_path: str, output_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to decompress an RLE compressed file
    
    Args:
        compressed_path: Path to compressed file
        output_path: Output path (optional)
    
    Returns:
        Decompression statistics
    """
    if output_path is None:
        output_path = compressed_path.replace('.rle', '_decompressed')
    
    compressor = RLECompressor()
    return compressor.decompress(compressed_path, output_path)

def analyze_file_for_RLE(file_path: str, threshold: int = 3) -> Dict[str, Any]:
    """
    Analyze a file to predict RLE compression effectiveness
    
    Args:
        file_path: Path to file to analyze
        threshold: Minimum run length threshold
        
    Returns:
        Analysis results
    """
    compressor = RLECompressor(threshold=threshold)
    return compressor.analyze_file(file_path)