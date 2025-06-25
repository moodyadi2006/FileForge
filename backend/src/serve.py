from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import tempfile
import os
from dotenv import load_dotenv
from utils.huffman_coding import compress_file, decompress_file
from utils.runlengthEncoding import compress_file_RLE, decompress_file_RLE, analyze_file_for_RLE
from utils.lz77 import compress_file_LZ77, decompress_file_LZ77, analyze_file_for_LZ77
import base64
import re

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("NEXTAUTH_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

def verify_token(
    authorization: str = Header(...),
    x_user_provider: str = Header(None, alias="X-User-Provider")
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Invalid auth header")

    token = authorization[7:] 
    provider = x_user_provider or "unknown"

    try:
        if provider == "google":
            return verify_google_token(token)
        elif provider == "credentials":
            return verify_credentials_token(token)
        else:
            return auto_detect_and_verify(token)
            
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        raise HTTPException(status_code=403, detail="Token verification failed")

def verify_google_token(token: str):
    try:
        import requests as http_requests
        
        response = http_requests.get(
            f"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={token}",
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=403, detail="Invalid Google access token")
        
        token_info = response.json()

        return {
            "provider": "google",
            "user_id": token_info.get("user_id"),
            "email": token_info.get("email"),
            "expires_in": token_info.get("expires_in"),
            "scope": token_info.get("scope")
        }
        
    except http_requests.RequestException as e:
        print(f"Google token verification failed: {str(e)}")
        raise HTTPException(status_code=403, detail="Failed to verify Google token")
    except Exception as e:
        print(f"Google token verification error: {str(e)}")
        raise HTTPException(status_code=403, detail="Invalid Google token")

def verify_credentials_token(token: str):
    try:
        if not re.match(r'^[a-fA-F0-9]{24}$', token):
            raise HTTPException(status_code=403, detail="Invalid user ID format")

        return {
            "provider": "credentials",
            "user_id": token,
            "_id": token
        }
        
    except Exception as e:
        print(f"Credentials token verification failed: {str(e)}")
        raise HTTPException(status_code=403, detail="Invalid credentials token")

def auto_detect_and_verify(token: str):
    try:
        if len(token) > 100 or '.' in token:
            try:
                return verify_google_token(token)
            except:
                pass
        
        if re.match(r'^[a-fA-F0-9]{24}$', token):
            return verify_credentials_token(token)
        
        raise HTTPException(status_code=403, detail="Unrecognized token format")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auto-detection failed: {str(e)}")
        raise HTTPException(status_code=403, detail="Token verification failed")

@app.post("/compression")
async def compression(
    mode: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token) 
):
    """
    Compress uploaded files using various algorithms
    
    Supported modes:
    - huffmanCoding: Optimal for text and structured data
    - runLengthEncoding: Good for data with repeated sequences
    - lZ77: General purpose compression
    """
    
    try:
        # Validate mode
        if mode not in ["huffmanCoding", "runLengthEncoding", "lZ77"]:
            raise HTTPException(status_code=400, detail="Invalid mode specified")

        # Handle Huffman Coding
        if mode == "huffmanCoding":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for Huffman coding")

            print(f"Processing {file.filename} with Huffman coding...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for compressed file
            temp_output_path = temp_input_path + ".huff"
            
            try:
                # Compress the file using Huffman coding
                compression_stats = compress_file(temp_input_path, temp_output_path)
                compression_info = compression_stats['compression_info']
                
                # Read the compressed file content
                with open(temp_output_path, 'rb') as compressed_file:
                    compressed_content = compressed_file.read()
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "compressed_filename": f"{file.filename}.huff",
                    "original_size": compression_stats['original_size'],
                    "compressed_size": compression_stats['compressed_size'],
                    "compression_ratio": f"{compression_stats['compression_ratio']:.2f}:1",
                    "space_saved_percent": f"{compression_stats['space_saved']:.1f}%",
                    "algorithm_info": {
                        "name": "Huffman Coding",
                        "description": "Optimal prefix-free encoding based on character frequencies",
                        "best_for": "Text files, source code, structured data with non-uniform character distribution",
                        "characteristics": "Lossless, variable-length codes, optimal for symbol-by-symbol encoding"
                    },
                    "compression_details": {
                        "total_symbols": compression_info.get('total_symbols', 0),
                        "average_code_length": f"{compression_info.get('average_code_length', 0):.2f} bits",
                        "code_length_range": f"{compression_info.get('min_code_length', 0)}-{compression_info.get('max_code_length', 0)} bits"
                    },
                    # Include compressed file as base64 encoded data
                    "compressed_file": base64.b64encode(compressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }
                
                return response_data
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

        elif mode == "runLengthEncoding":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for RLE compression")

            print(f"Processing {file.filename} with Run-Length Encoding...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for compressed file
            temp_output_path = temp_input_path + ".rle"
            
            try:
                # Compress the file using RLE
                compression_stats = compress_file_RLE(temp_input_path, temp_output_path, threshold=3)
                compression_info = compression_stats['compression_info']
                
                # Read the compressed file content
                with open(temp_output_path, 'rb') as compressed_file:
                    compressed_content = compressed_file.read()
                
                # Analyze file for additional insights
                file_analysis = analyze_file_for_RLE(temp_input_path)
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "compressed_filename": f"{file.filename}.rle",
                    "original_size": compression_stats['original_size'],
                    "compressed_size": compression_stats['compressed_size'],
                    "compression_ratio": f"{compression_stats['compression_ratio']:.2f}:1",
                    "space_saved_percent": f"{compression_stats['space_saved']:.1f}%",
                    "algorithm_info": {
                        "name": "Run-Length Encoding (RLE)",
                        "description": "Stores sequences of identical consecutive values as count-value pairs",
                        "best_for": "Images with solid areas, simple graphics, bitmap data, repetitive patterns",
                        "characteristics": "Lossless, simple algorithm, excellent for data with long runs of identical values"
                    },
                    "compression_details_RLE": {
                        "total_runs": compression_info.get('runs_created', 0),
                        "literal_segments": compression_info.get('literal_segments', 0),
                        "threshold_used": compression_info.get('threshold_used', 3),
                        "compression_efficiency": f"{compression_info.get('compression_efficiency', 0):.1f}%",
                        "unique_byte_values": compression_info.get('unique_byte_values', 0)
                    },
                    "file_analysis": {
                        "unique_bytes": file_analysis.get('unique_bytes', 0),
                        "estimated_compressible_bytes": file_analysis.get('estimated_compressible_bytes', 0),
                        "estimated_compression_ratio": f"{file_analysis.get('estimated_compression_ratio', 0):.2%}",
                        "recommendation": file_analysis.get('recommendation', 'Analysis unavailable'),
                        "run_distribution": file_analysis.get('run_distribution', {}),
                        "most_frequent_byte": file_analysis.get('top_5_bytes', [{}])[0] if file_analysis.get('top_5_bytes') else {}
                    },
                    # Include compressed file as base64 encoded data
                    "compressed_file": base64.b64encode(compressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }

                print(response_data)
                
                return response_data
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"RLE compression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

        elif mode == "lZ77":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for LZ77 compression")

            print(f"Processing {file.filename} with LZ77 compression...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for compressed file
            temp_output_path = temp_input_path + ".lz77"
            
            try:
                # Compress the file using LZ77
                compression_stats = compress_file_LZ77(temp_input_path, temp_output_path)
                compression_info = compression_stats['compression_info']
                
                # Read the compressed file content
                with open(temp_output_path, 'rb') as compressed_file:
                    compressed_content = compressed_file.read()
                
                # Analyze file for additional insights
                file_analysis = analyze_file_for_LZ77(temp_input_path)
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "compressed_filename": f"{file.filename}.lz77",
                    "original_size": compression_stats['original_size'],
                    "compressed_size": compression_stats['compressed_size'],
                    "compression_ratio": f"{compression_stats['compression_ratio']:.2f}:1",
                    "space_saved_percent": f"{compression_stats['space_saved']:.1f}%",
                    "algorithm_info": {
                        "name": "LZ77 (Lempel-Ziv 1977)",
                        "description": "Sliding window compression that replaces repeated sequences with references to earlier occurrences",
                        "best_for": "Text files, source code, structured data, HTML/XML, general purpose files",
                        "characteristics": "Lossless, adaptive learning, foundation for ZIP/GZIP, good balance of ratio and speed"
                    },
                    "compression_details_LZ77": {
                        "window_size": compression_info.get('window_size', 4096),
                        "lookahead_size": compression_info.get('lookahead_size', 18),
                        "triplets_generated": compression_stats.get('triplets_generated', 0),
                        "matches_found": compression_stats.get('matches_found', 0),
                        "literals": compression_stats.get('literals', 0),
                        "average_match_length": f"{compression_stats.get('average_match_length', 0):.2f}",
                        "bytes_saved_from_matches": compression_stats.get('bytes_saved_from_matches', 0),
                        "compression_efficiency": f"{compression_stats.get('compression_efficiency', 0):.1f}%",
                        "unique_bytes": compression_stats.get('unique_bytes', 0)
                    },
                    "file_analysis_LZ77": {
                        "entropy": f"{file_analysis.get('entropy', 0):.2f}",
                        "potential_matches": file_analysis.get('potential_matches', 0),
                        "estimated_match_ratio": f"{file_analysis.get('estimated_match_ratio', 0):.2%}",
                        "longest_match": file_analysis.get('longest_match', 0),
                        "estimated_compression_ratio": f"{file_analysis.get('estimated_compression_ratio', 1):.2f}:1",
                        "recommendation": file_analysis.get('recommendation', 'Analysis unavailable'),
                        "top_5_bytes": file_analysis.get('top_5_bytes', []),
                        "common_patterns": file_analysis.get('common_patterns', [])
                    },
                    # Include compressed file as base64 encoded data
                    "compressed_file": base64.b64encode(compressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }
                
                # Add most frequent byte info if available
                if compression_stats.get('most_common_byte'):
                    byte_val, count = compression_stats['most_common_byte']
                    response_data["compression_details_LZ77"]["most_frequent_byte"] = {
                        'value': f'\\x{byte_val:02x}' if byte_val < 32 or byte_val > 126 else chr(byte_val),
                        'count': count,
                        'percentage': f"{(count / compression_stats['original_size']) * 100:.1f}%"
                    }
                
                return response_data
                
            except Exception as e:
                print(f"LZ77 compression error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"LZ77 compression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/decompression")
async def decompression(
    mode: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(verify_token) 
):
    try:
        # Validate mode
        if mode not in ["huffmanCoding", "runLengthEncoding", "lZ77"]:
            raise HTTPException(status_code=400, detail="Invalid mode specified")

        if mode == "huffmanCoding":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for Huffman coding")

            print(f"Processing {file.filename} with Huffman decompression...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for decompressed file
            original_name = file.filename.replace('.huff', '') if file.filename.endswith('.huff') else f"{file.filename}_decompressed"
            temp_output_path = temp_input_path + "_decompressed"
            
            try:
                # Decompress the file using Huffman coding
                decompression_stats = decompress_file(temp_input_path, temp_output_path)
                
                # Read the decompressed file content
                with open(temp_output_path, 'rb') as decompressed_file:
                    decompressed_content = decompressed_file.read()
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "decompressed_filename": original_name,
                    "file_info": {
                        "compressed_file_size": decompression_stats.get('compressed_file_size', 0),
                        "original_size": decompression_stats.get('original_size', 0),
                        "decompressed_size": decompression_stats.get('decompressed_size', 0),
                        "size_match": decompression_stats.get('size_match', False)
                    },
                    "bit_analysis": {
                        "total_bits_in_file": decompression_stats.get('total_bits_in_file', 0),
                        "effective_bits_used": decompression_stats.get('effective_bits_used', 0),
                        "padding_bits": decompression_stats.get('padding_bits', 0)
                    },
                    "decompression_details": {
                        "characters_decoded": decompression_stats.get('characters_decoded', 0),
                        "unique_characters": decompression_stats.get('unique_characters', 0),
                        "tree_depth": decompression_stats.get('tree_depth', None)
                    },
                    "performance_metrics": {
                        "decompression_time_seconds": decompression_stats.get('decompression_time_seconds', 0),
                        "processing_speed": f"{decompression_stats.get('decompressed_size', 0) / max(decompression_stats.get('decompression_time_seconds', 1), 0.001) / 1024:.2f} KB/s"
                    },
                    "metadata": {
                        "compression_timestamp": decompression_stats.get('compression_timestamp', None),
                        "decompression_timestamp": decompression_stats.get('decompression_timestamp', None)
                    },
                    "algorithm_info": {
                        "name": "Huffman Coding Decompression",
                        "description": "Lossless decompression using optimal prefix-free decoding",
                        "process": "Tree traversal to decode variable-length codes back to original symbols"
                    },
                    "validation": {
                        "success": decompression_stats.get('success', False),
                        "error_message": decompression_stats.get('error_message', None),
                        "integrity_check": "Passed" if decompression_stats.get('size_match', False) else "Failed"
                    },
                    # Include decompressed file as base64 encoded data
                    "decompressed_file": base64.b64encode(decompressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }
                
                return response_data
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Decompression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

        elif mode == "runLengthEncoding":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for RLE decompression")

            print(f"Processing {file.filename} with Run-Length Encoding decompression...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for decompressed file
            original_name = file.filename.replace('.rle', '') if file.filename.endswith('.rle') else f"{file.filename}_decompressed"
            temp_output_path = temp_input_path + f"_decompressed_{original_name}"
            
            try:
                # Decompress the file using RLE
                decompression_stats = decompress_file_RLE(temp_input_path, temp_output_path)
                
                # Read the decompressed file content
                with open(temp_output_path, 'rb') as decompressed_file:
                    decompressed_content = decompressed_file.read()
                
                # Get original compressed file size for reference
                original_compressed_size = os.path.getsize(temp_input_path)
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "decompressed_filename": original_name,
                    "compressed_size": original_compressed_size,
                    "decompressed_size": decompression_stats['decompressed_size'],
                    "original_size": decompression_stats['original_size'],
                    "decompression_successful": decompression_stats['success'],
                    "algorithm_info": {
                        "name": "Run-Length Encoding (RLE) Decompression",
                        "description": "Expands count-value pairs back to original sequences of identical values",
                        "process": "Reverses RLE compression to restore original file data",
                        "characteristics": "Lossless decompression, restores exact original data"
                    },
                    "decompression_details_RLE": {
                        "runs_processed": decompression_stats.get('runs_processed', 0),
                        "literal_segments_processed": decompression_stats.get('literal_segments_processed', 0),
                        "decompression_successful": decompression_stats.get('success', False),
                        "size_verification": "Passed" if decompression_stats.get('success', False) else "Failed"
                    },
                    # Include decompressed file as base64 encoded data
                    "decompressed_file": base64.b64encode(decompressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }
                
                return response_data
                
            except Exception as e:
                print(f"RLE decompression error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"RLE decompression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

        elif mode == "lZ77":
            if not file:
                raise HTTPException(status_code=400, detail="File is required for LZ77 decompression")

            print(f"Processing {file.filename} with LZ77 decompression...")
            
            # Create temporary files for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_input:
                file_content = await file.read()
                temp_input.write(file_content)
                temp_input_path = temp_input.name
            
            # Create output path for decompressed file
            original_name = file.filename.replace('.lz77', '') if file.filename.endswith('.lz77') else f"{file.filename}_decompressed"
            temp_output_path = temp_input_path + f"_decompressed_{original_name}"
            
            try:
                # Decompress the file using LZ77
                decompression_stats = decompress_file_LZ77(temp_input_path, temp_output_path)
                
                # Read the decompressed file content
                with open(temp_output_path, 'rb') as decompressed_file:
                    decompressed_content = decompressed_file.read()
                
                # Get original compressed file size for reference
                original_compressed_size = os.path.getsize(temp_input_path)
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "mode": mode,
                    "original_filename": file.filename,
                    "decompressed_filename": original_name,
                    "compressed_size": original_compressed_size,
                    "decompressed_size": decompression_stats['decompressed_size'],
                    "original_size": decompression_stats['original_size'],
                    "decompression_successful": decompression_stats['success'],
                    "algorithm_info": {
                        "name": "LZ77 (Lempel-Ziv 1977) Decompression",
                        "description": "Sliding window decompression that expands references back to original sequences",
                        "process": "Processes triplets (distance, length, next_char) to reconstruct original data",
                        "characteristics": "Lossless decompression, restores exact original data using sliding window"
                    },
                    "decompression_details_LZ77": {
                        "triplets_processed": decompression_stats.get('triplets_processed', 0),
                        "matches_processed": decompression_stats.get('matches_processed', 0),
                        "literals_processed": decompression_stats.get('literals_processed', 0),
                        "decompression_successful": decompression_stats.get('success', False),
                        "size_verification": "Passed" if decompression_stats.get('success', False) else "Failed",
                        "integrity_check": "Original size matches decompressed size" if decompression_stats.get('success', False) else "Size mismatch detected"
                    },
                    "performance_metrics": {
                        "original_vs_decompressed": {
                            "original_size": decompression_stats['original_size'],
                            "decompressed_size": decompression_stats['decompressed_size'],
                            "match": decompression_stats['original_size'] == decompression_stats['decompressed_size']
                        }
                    },
                    "validation": {
                        "success": decompression_stats.get('success', False),
                        "error_message": None if decompression_stats.get('success', False) else "Decompression validation failed",
                        "integrity_check": "Passed" if decompression_stats.get('success', False) else "Failed"
                    },
                    # Include decompressed file as base64 encoded data
                    "decompressed_file": base64.b64encode(decompressed_content).decode('utf-8'),
                    "content_type": "application/octet-stream"
                }

                print("LZ77 decompression completed successfully")
                print(f"Original size: {decompression_stats['original_size']} bytes")
                print(f"Decompressed size: {decompression_stats['decompressed_size']} bytes")
                print(f"Success: {decompression_stats['success']}")
                print(f"Triplets processed: {decompression_stats.get('triplets_processed', 0)}")
                print(f"Matches processed: {decompression_stats.get('matches_processed', 0)}")
                
                return response_data
                
            except ValueError as ve:
                # Handle specific LZ77 validation errors
                print(f"LZ77 file validation error: {str(ve)}")
                raise HTTPException(status_code=400, detail=f"Invalid LZ77 file: {str(ve)}")
                
            except Exception as e:
                print(f"LZ77 decompression error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"LZ77 decompression failed: {str(e)}")
            
            finally:
                # Cleanup temporary files
                if os.path.exists(temp_input_path):
                    os.remove(temp_input_path)
                if os.path.exists(temp_output_path):
                    os.remove(temp_output_path)

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
