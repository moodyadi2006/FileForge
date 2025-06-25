import pickle
import os
from collections import Counter
from typing import Dict, Tuple, Any, Optional, List

class LZ77Compressor:
    """
    LZ77 (Lempel-Ziv 1977) Compression Algorithm
    
    LZ77 is a lossless data compression algorithm that uses a sliding window approach.
    It finds repeated sequences in the data and replaces them with references to 
    earlier occurrences within a sliding window.
    
    How it works:
    1. Maintain a sliding window of recently processed data (dictionary)
    2. For each position, find the longest match in the sliding window
    3. Output a triplet: (distance, length, next_character)
    4. Move the window forward and repeat
    
    The output consists of:
    - Distance: How far back the match starts (0 if no match)
    - Length: How long the match is (0 if no match)  
    - Next character: The character following the match
    
    Benefits:
    - Excellent for text and structured data with repeated patterns
    - Foundation for many modern compression algorithms (ZIP, GZIP, PNG)
    - Adaptive - learns patterns as it processes data
    - Good balance of compression ratio and speed
    
    Best for: Text files, source code, structured data, HTML/XML
    Also good for: General purpose files, binary data with patterns
    Less effective for: Random data, already compressed files, very small files
    
    Parameters:
    - window_size: Size of the sliding window (dictionary)
    - lookahead_size: Maximum length of matches to find
    """
    
    def __init__(self, window_size: int = 4096, lookahead_size: int = 18):
        """
        Initialize LZ77 compressor
        
        Args:
            window_size: Size of sliding window (default: 4096 bytes)
            lookahead_size: Maximum match length (default: 18 bytes)
        """
        self.window_size = window_size
        self.lookahead_size = lookahead_size
        self.stats = {}
        
        # Validate parameters
        if window_size <= 0 or window_size > 32768:
            raise ValueError("Window size must be between 1 and 32768")
        if lookahead_size <= 0 or lookahead_size > 255:
            raise ValueError("Lookahead size must be between 1 and 255")
    
    def _find_longest_match(self, data: bytes, current_pos: int) -> Tuple[int, int]:
        """
        Find the longest match in the sliding window
        
        Args:
            data: Input data
            current_pos: Current position in data
            
        Returns:
            Tuple of (distance, length) of longest match
            Returns (0, 0) if no match found
        """
        # Define the sliding window boundaries
        window_start = max(0, current_pos - self.window_size)
        window_end = current_pos
        
        # Define lookahead buffer boundaries
        lookahead_start = current_pos
        lookahead_end = min(len(data), current_pos + self.lookahead_size)
        
        best_distance = 0
        best_length = 0
        
        # Search for matches in the sliding window
        for i in range(window_start, window_end):
            # Check how long the match is
            match_length = 0
            
            # Compare bytes until mismatch or end of lookahead
            while (i + match_length < window_end and 
                   lookahead_start + match_length < lookahead_end and
                   data[i + match_length] == data[lookahead_start + match_length]):
                match_length += 1
            
            # Update best match if this one is longer
            if match_length > best_length:
                best_length = match_length
                best_distance = current_pos - i
                
                # Early termination if we've reached maximum possible length
                if best_length >= self.lookahead_size:
                    break
        
        # Only return matches of length 3 or more (typical LZ77 threshold)
        if best_length >= 3:
            return best_distance, best_length
        else:
            return 0, 0
    
    def _encode_triplet(self, distance: int, length: int, next_char: int) -> bytes:
        """
        Encode a LZ77 triplet into bytes
        
        Format: [DISTANCE_HIGH][DISTANCE_LOW][LENGTH][NEXT_CHAR]
        - Distance: 2 bytes (big-endian)
        - Length: 1 byte
        - Next char: 1 byte
        
        Total: 4 bytes per triplet
        """
        # Ensure values fit in their allocated space
        distance = min(distance, 65535)  # 2 bytes max
        length = min(length, 255)       # 1 byte max
        next_char = next_char & 0xFF    # 1 byte
        
        return bytes([
            (distance >> 8) & 0xFF,  # High byte of distance
            distance & 0xFF,         # Low byte of distance
            length,                  # Length
            next_char               # Next character
        ])
    
    def _decode_triplet(self, data: bytes, offset: int) -> Tuple[int, int, int, int]:
        """
        Decode a triplet from bytes
        
        Returns:
            Tuple of (distance, length, next_char, bytes_consumed)
        """
        if offset + 3 >= len(data):
            raise ValueError("Incomplete triplet data")
        
        distance = (data[offset] << 8) | data[offset + 1]
        length = data[offset + 2]
        next_char = data[offset + 3]
        
        return distance, length, next_char, 4
    
    def _compress_data(self, data: bytes) -> List[Tuple[int, int, int]]:
        """
        Compress data into LZ77 triplets
        
        Returns:
            List of triplets (distance, length, next_char)
        """
        triplets = []
        i = 0
        matches_found = 0
        total_match_length = 0
        
        while i < len(data):
            # Find longest match in sliding window
            distance, length = self._find_longest_match(data, i)
            
            if distance > 0 and length > 0:
                # Found a match
                next_char_pos = i + length
                next_char = data[next_char_pos] if next_char_pos < len(data) else 0
                
                triplets.append((distance, length, next_char))
                matches_found += 1
                total_match_length += length
                
                # Move past the match and the next character
                i += length + 1
            else:
                # No match found, store literal character
                triplets.append((0, 0, data[i]))
                i += 1
        
        # Update statistics
        self.stats.update({
            'matches_found': matches_found,
            'total_match_length': total_match_length,
            'literals': len(triplets) - matches_found
        })
        
        return triplets
    
    def compress(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """
        Compress a file using LZ77 algorithm
        
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
        
        # Analyze input data
        byte_counts = Counter(data)
        
        # Compress data
        triplets = self._compress_data(data)
        
        # Encode triplets to bytes
        compressed_data = bytearray()
        for distance, length, next_char in triplets:
            compressed_data.extend(self._encode_triplet(distance, length, next_char))
        
        # Calculate additional statistics
        matches = sum(1 for d, l, _ in triplets if d > 0)
        literals = len(triplets) - matches
        saved_bytes = sum(l - 4 for d, l, _ in triplets if d > 0 and l > 4)  # Only matches longer than triplet size save space
        
        # Save compressed file with metadata
        compression_data = {
            'compressed_data': bytes(compressed_data),
            'original_size': original_size,
            'window_size': self.window_size,
            'lookahead_size': self.lookahead_size,
            'triplet_count': len(triplets),
            'matches': matches,
            'literals': literals
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
            'triplets_generated': len(triplets),
            'matches_found': matches,
            'literals': literals,
            'bytes_saved_from_matches': saved_bytes,
            'average_match_length': sum(l for d, l, _ in triplets if d > 0) / matches if matches > 0 else 0,
            'unique_bytes': len(byte_counts),
            'most_common_byte': byte_counts.most_common(1)[0] if byte_counts else None,
            'compression_efficiency': (saved_bytes / original_size) * 100 if original_size > 0 else 0
        }
        
        return self.stats
    
    def decompress(self, compressed_file: str, output_file: str) -> Dict[str, Any]:
        """
        Decompress an LZ77 encoded file
        
        Args:
            compressed_file: Path to compressed file
            output_file: Path to decompressed output file
            
        Returns:
            Dictionary with decompression statistics
        """
        # Validate file format
        with open(compressed_file, 'rb') as f:
            header = f.read(10)
            
        # Check for common non-LZ77 file types
        if header.startswith(b'\x89PNG'):
            raise ValueError(f"File {compressed_file} is a PNG image, not an LZ77-compressed file")
        
        if header.startswith(b'JFIF') or header.startswith(b'\xff\xd8'):
            raise ValueError(f"File {compressed_file} is a JPEG image, not an LZ77-compressed file")
        
        if not (header.startswith(b'\x80\x03') or header.startswith(b'\x80\x04') or header.startswith(b'\x80\x05')):
            raise ValueError(f"File {compressed_file} does not appear to be a pickle file (expected LZ77 format)")
        
        # Load compressed data
        with open(compressed_file, 'rb') as f:
            compression_data = pickle.load(f)
        
        compressed_data = compression_data['compressed_data']
        original_size = compression_data['original_size']
        
        # Decompress data
        decompressed_data = bytearray()
        i = 0
        triplets_processed = 0
        matches_processed = 0
        
        while i < len(compressed_data):
            # Decode triplet
            distance, length, next_char, consumed = self._decode_triplet(compressed_data, i)
            i += consumed
            triplets_processed += 1
            
            if distance > 0 and length > 0:
                # Copy from sliding window
                matches_processed += 1
                start_pos = len(decompressed_data) - distance
                
                if start_pos < 0:
                    raise ValueError(f"Invalid distance reference: {distance} at position {len(decompressed_data)}")
                
                # Copy the match (byte by byte to handle overlapping matches)
                for _ in range(length):
                    if start_pos >= len(decompressed_data):
                        raise ValueError("Distance reference beyond available data")
                    decompressed_data.append(decompressed_data[start_pos])
                    start_pos += 1
                
                # Add the next character
                if next_char != 0 or i < len(compressed_data):  # Don't add null terminator at end
                    decompressed_data.append(next_char)
            else:
                # Literal character
                decompressed_data.append(next_char)
        
        # Write decompressed file
        with open(output_file, 'wb') as f:
            f.write(bytes(decompressed_data))
        
        # Calculate decompression statistics
        decompressed_size = len(decompressed_data)
        self.stats = {
            'original_size': original_size,
            'decompressed_size': decompressed_size,
            'success': decompressed_size == original_size,
            'triplets_processed': triplets_processed,
            'matches_processed': matches_processed,
            'literals_processed': triplets_processed - matches_processed
        }
        
        return self.stats
    
    def get_compression_info(self) -> Dict[str, Any]:
        """Get detailed information about the compression"""
        if not self.stats:
            return {}
        
        info = {
            'window_size': self.window_size,
            'lookahead_size': self.lookahead_size,
            'compression_efficiency': self.stats.get('space_saved', 0),
            'matches_found': self.stats.get('matches_found', 0),
            'literals': self.stats.get('literals', 0),
            'average_match_length': self.stats.get('average_match_length', 0),
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
        Analyze a file to predict LZ77 compression effectiveness
        
        Args:
            file_path: Path to file to analyze
            
        Returns:
            Analysis results with compression predictions
        """
        with open(file_path, 'rb') as f:
            data = f.read()
        
        if not data:
            return {'error': 'File is empty'}
        
        file_size = len(data)
        
        # Sample analysis (analyze first portion for large files)
        sample_size = min(file_size, 10000)  # Analyze first 10KB
        sample_data = data[:sample_size]
        
        # Find potential matches
        potential_matches = 0
        total_match_length = 0
        match_lengths = []
        
        for i in range(len(sample_data)):
            distance, length = self._find_longest_match(sample_data, i)
            if distance > 0 and length > 0:
                potential_matches += 1
                total_match_length += length
                match_lengths.append(length)
        
        # Byte frequency analysis
        byte_frequency = Counter(data)
        entropy = self._calculate_entropy(byte_frequency, file_size)
        
        # Pattern analysis
        repeated_patterns = self._find_common_patterns(data[:sample_size])
        
        return {
            'file_size': file_size,
            'sample_analyzed': sample_size,
            'unique_bytes': len(byte_frequency),
            'entropy': entropy,
            'potential_matches': potential_matches,
            'estimated_match_ratio': potential_matches / sample_size if sample_size > 0 else 0,
            'average_match_length': sum(match_lengths) / len(match_lengths) if match_lengths else 0,
            'longest_match': max(match_lengths) if match_lengths else 0,
            'estimated_compression_ratio': self._estimate_compression_ratio(potential_matches, total_match_length, sample_size),
            'top_5_bytes': [
                {
                    'byte': f'\\x{b:02x}' if b < 32 or b > 126 else chr(b),
                    'count': c,
                    'percentage': (c / file_size) * 100
                }
                for b, c in byte_frequency.most_common(5)
            ],
            'common_patterns': repeated_patterns,
            'recommendation': self._get_recommendation(potential_matches, sample_size, entropy)
        }
    
    def _calculate_entropy(self, byte_frequency: Counter, total_bytes: int) -> float:
        """Calculate Shannon entropy of the data"""
        import math
        
        entropy = 0.0
        for count in byte_frequency.values():
            if count > 0:
                probability = count / total_bytes
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    def _find_common_patterns(self, data: bytes, min_length: int = 4, max_patterns: int = 5) -> List[Dict]:
        """Find common repeated patterns in data"""
        patterns = Counter()
        
        # Look for patterns of different lengths
        for length in range(min_length, min(20, len(data) // 4)):
            for i in range(len(data) - length + 1):
                pattern = data[i:i + length]
                patterns[pattern] += 1
        
        # Return most common patterns
        common_patterns = []
        for pattern, count in patterns.most_common(max_patterns):
            if count > 1:  # Only patterns that repeat
                # Convert to readable format
                readable = ''.join(chr(b) if 32 <= b <= 126 else f'\\x{b:02x}' for b in pattern)
                common_patterns.append({
                    'pattern': readable,
                    'length': len(pattern),
                    'occurrences': count,
                    'bytes_saved': (len(pattern) - 4) * (count - 1)  # Estimate bytes saved
                })
        
        return common_patterns
    
    def _estimate_compression_ratio(self, matches: int, match_length: int, sample_size: int) -> float:
        """Estimate compression ratio based on sample analysis"""
        if sample_size == 0:
            return 1.0
        
        # Rough estimation: each match saves (match_length - 4) bytes
        # (since each triplet is 4 bytes)
        bytes_saved = sum(max(0, l - 4) for l in [match_length] if matches > 0)
        estimated_compressed_size = sample_size - bytes_saved + (sample_size * 0.1)  # Add overhead
        
        return sample_size / max(estimated_compressed_size, 1)
    
    def _get_recommendation(self, matches: int, sample_size: int, entropy: float) -> str:
        """Generate recommendation based on analysis"""
        match_ratio = matches / sample_size if sample_size > 0 else 0
        
        if entropy > 7.5:
            return "LZ77 not recommended - data appears random/already compressed"
        elif match_ratio < 0.05:
            return "LZ77 may not be effective - few repeated patterns found"
        elif match_ratio < 0.15:
            return "LZ77 may provide modest compression - some patterns detected"
        elif match_ratio < 0.30:
            return "LZ77 should provide good compression - many repeated patterns"
        else:
            return "LZ77 highly recommended - excellent pattern repetition detected"

def compress_file_LZ77(input_path: str, output_path: str = None, 
                      window_size: int = 4096, lookahead_size: int = 18) -> Dict[str, Any]:
    """
    Convenience function to compress any file using LZ77
    
    Args:
        input_path: Path to file to compress
        output_path: Output path (optional)
        window_size: Sliding window size
        lookahead_size: Maximum match length
    
    Returns:
        Compression statistics
    """
    if output_path is None:
        output_path = input_path + '.lz77'
    
    compressor = LZ77Compressor(window_size=window_size, lookahead_size=lookahead_size)
    stats = compressor.compress(input_path, output_path)
    compression_info = compressor.get_compression_info()
    
    return {**stats, 'compression_info': compression_info}

def decompress_file_LZ77(compressed_path: str, output_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to decompress an LZ77 compressed file
    
    Args:
        compressed_path: Path to compressed file
        output_path: Output path (optional)
    
    Returns:
        Decompression statistics
    """
    if output_path is None:
        output_path = compressed_path.replace('.lz77', '_decompressed')
    
    compressor = LZ77Compressor()
    return compressor.decompress(compressed_path, output_path)

def analyze_file_for_LZ77(file_path: str, window_size: int = 4096, 
                         lookahead_size: int = 18) -> Dict[str, Any]:
    """
    Analyze a file to predict LZ77 compression effectiveness
    
    Args:
        file_path: Path to file to analyze
        window_size: Sliding window size
        lookahead_size: Maximum match length
        
    Returns:
        Analysis results
    """
    compressor = LZ77Compressor(window_size=window_size, lookahead_size=lookahead_size)
    return compressor.analyze_file(file_path)